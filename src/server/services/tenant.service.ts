/**
 * Tenant service — ALL tenant-management business logic (Phase 4).
 * Consumed only after the PLATFORM_ADMIN role gate; every function is
 * platform-scoped by design. Tenant isolation is not weakened here — this
 * service never executes under a TENANT_ADMIN context.
 *
 * Key guarantees (docs/tenant-management.md):
 *   · atomic provisioning: Tenant + exactly one Tenant Admin + WebsiteConfig
 *     inside a MongoDB transaction (sequential-with-rollback fallback for
 *     standalone mongod deployments — documented)
 *   · slug: normalized, reserved-checked, unique — conflicts are explicit
 *   · lifecycle matrix: ACTIVE ↔ SUSPENDED · ACTIVE → ARCHIVED · ARCHIVED → ACTIVE
 *   · suspension/archival destroys the tenant's live admin sessions
 *   · password reset: generates a one-time temporary password, hashes it,
 *     invalidates sessions — existing passwords are never retrievable
 */

import mongoose from "mongoose";
import { PackageModel } from "@/db/models/package.model";
import { SessionModel } from "@/db/models/session.model";
import { TenantModel, type TenantDocument } from "@/db/models/tenant.model";
import { UserModel } from "@/db/models/user.model";
import { WebsiteConfigModel } from "@/db/models/website-config.model";
import { apiErrors } from "@/server/http/errors";
import { getLogger } from "@/server/utils/logger";
import {
  checkPasswordPolicy,
  generateTemporaryPassword,
  hashPassword,
} from "@/server/utils/password";
import { isReservedSlug, isValidSlug, normalizeSlug } from "@/server/utils/slug";
import type { HydratedDocument } from "mongoose";
import type { PackageStatus, TenantStatus } from "@/types/domain";
import type {
  ListTenantsQuery,
  Paginated,
  PlatformStats,
  TenantPackageSummary,
  PasswordResetResult,
  TenantCreationResult,
  TenantListItem,
  TenantDetails,
  TenantStats,
} from "@/types/tenant";
import type {
  CreateTenantWithAdminInput,
  UpdateTenantInput,
} from "@/server/validators/tenant.validators";

const log = getLogger("tenant");

export const TENANTS_PAGE_LIMIT_DEFAULT = 20;
export const TENANTS_PAGE_LIMIT_MAX = 50;

/* ── Mapping helpers (documents → safe DTOs) ─────────────────────────────── */

function toTenantDetailsTenant(doc: HydratedDocument<TenantDocument>): TenantDetails["tenant"] {
  return {
    id: String(doc._id),
    companyName: doc.companyName,
    slug: doc.slug,
    status: doc.status,
    contact: doc.contact ?? {},
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/* ── Duplicate-key mapping (turns DB invariants into clean API conflicts) ── */

function mapDuplicateError(error: unknown, context: { slug: string; email: string }): unknown {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    const keyValue = JSON.stringify((error as { keyValue?: unknown }).keyValue ?? {});
    if (keyValue.includes("slug")) return apiErrors.tenantSlugTaken();
    if (keyValue.includes("email")) return apiErrors.emailTaken();
    if (keyValue.includes("tenantId") || keyValue.includes("role")) {
      return apiErrors.tenantAdminExists();
    }
    log.error({ err: error, keyValue, context }, "unmapped duplicate key error");
  }
  return error;
}

function isTransactionsUnsupported(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return (
    text.includes("Transaction numbers are only allowed") ||
    text.includes("Transactions are not supported") ||
    text.includes("replica set member or mongos")
  );
}

/* ── Slug preparation ────────────────────────────────────────────────────── */

async function assertSlugUsable(rawSlug: string, excludeTenantId?: string): Promise<string> {
  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) {
    throw apiErrors.validation(
      `'slug': "${slug}" is not usable — use 2–48 lowercase letters, numbers, and hyphens`,
    );
  }
  if (isReservedSlug(slug)) throw apiErrors.tenantSlugReserved();
  const query: Record<string, unknown> = { slug };
  if (excludeTenantId) query._id = { $ne: excludeTenantId };
  const existing = await TenantModel.findOne(query).lean();
  if (existing) throw apiErrors.tenantSlugTaken();
  return slug;
}

/* ── Atomic tenant provisioning ──────────────────────────────────────────── */

interface ProvisionArtifacts {
  tenantId: string;
  adminId: string;
}

async function provisionSequentialRollback(
  ctx: HydratedDocument<TenantDocument>,
  admin: { name: string; email: string; passwordHash: string },
): Promise<ProvisionArtifacts> {
  /** Fallback for standalone mongod (no transactions): compensate manually. */
  await ctx.save();
  let adminDoc;
  try {
    adminDoc = await UserModel.create({
      name: admin.name,
      email: admin.email,
      passwordHash: admin.passwordHash,
      role: "TENANT_ADMIN",
      tenantId: ctx._id,
      status: "ACTIVE",
    });
  } catch (error) {
    await TenantModel.deleteOne({ _id: ctx._id }).catch(() => undefined);
    throw error;
  }
  try {
    await WebsiteConfigModel.create({
      tenantId: ctx._id,
      contact: {
        phone: ctx.contact?.phone,
        email: ctx.contact?.email,
        address: ctx.contact?.address,
      },
    });
  } catch (error) {
    await UserModel.deleteOne({ _id: adminDoc._id }).catch(() => undefined);
    await TenantModel.deleteOne({ _id: ctx._id }).catch(() => undefined);
    throw error;
  }
  log.warn("tenant provisioned without transactions (standalone mongod) — rollback path used on failure");
  return { tenantId: String(ctx._id), adminId: String(adminDoc._id) };
}

export async function createTenantWithAdmin(
  input: CreateTenantWithAdminInput,
): Promise<TenantCreationResult> {
  const slug = await assertSlugUsable(input.slug);

  const email = input.admin.email;
  const emailTaken = await UserModel.exists({ email });
  if (emailTaken) throw apiErrors.emailTaken();

  const generated = !input.admin.password;
  const temporaryPassword = input.admin.password ?? generateTemporaryPassword();
  const policy = checkPasswordPolicy(temporaryPassword);
  if (!policy.valid) throw apiErrors.validation(`'admin.password': ${policy.issues.join("; ")}`);
  const passwordHash = await hashPassword(temporaryPassword);

  const tenant = new TenantModel({
    companyName: input.companyName,
    slug,
    status: "ACTIVE",
    contact: input.contact ?? {},
  });

  // Fast pre-checks above; the DB unique indexes remain the final authority.
  let artifacts: ProvisionArtifacts;
  const txSession = await mongoose.startSession();
  try {
    await txSession.withTransaction(async () => {
      await tenant.save({ session: txSession });
      const adminDoc = await UserModel.create(
        [
          {
            name: input.admin.name,
            email,
            passwordHash,
            role: "TENANT_ADMIN",
            tenantId: tenant._id,
            status: "ACTIVE",
          },
        ],
        { session: txSession },
      );
      await WebsiteConfigModel.create(
        [
          {
            tenantId: tenant._id,
            contact: {
              phone: tenant.contact?.phone,
              email: tenant.contact?.email,
              address: tenant.contact?.address,
            },
          },
        ],
        { session: txSession },
      );
      artifacts = { tenantId: String(tenant._id), adminId: String(adminDoc[0]!._id) };
    });
  } catch (error) {
    if (isTransactionsUnsupported(error)) {
      artifacts = await provisionSequentialRollback(tenant, { name: input.admin.name, email, passwordHash });
    } else {
      throw mapDuplicateError(error, { slug, email });
    }
  } finally {
    await txSession.endSession();
  }

  log.info({ tenantId: artifacts!.tenantId, slug }, "tenant provisioned (tenant + admin + website config)");
  const fresh = await TenantModel.findById(artifacts!.tenantId);
  if (!fresh) throw apiErrors.internal("Tenant was not persisted as expected.");

  return {
    tenant: toTenantDetailsTenant(fresh),
    admin: { id: artifacts!.adminId, name: input.admin.name, email },
    ...(generated ? { temporaryPassword } : {}),
  };
}

/* ── List / search / filter / sort / paginate ────────────────────────────── */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface TenantListAggregateRow {
  _id: mongoose.Types.ObjectId;
  companyName: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  packageCount: number;
  admin?: Array<{ _id: mongoose.Types.ObjectId; name: string; email: string }>;
}

export async function listTenants(query: ListTenantsQuery): Promise<Paginated<TenantListItem>> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(TENANTS_PAGE_LIMIT_MAX, Math.max(1, query.limit ?? TENANTS_PAGE_LIMIT_DEFAULT));
  const status = query.status ?? "ALL";
  const sort = query.sort ?? "newest";
  const search = query.search?.trim();

  const pipeline: mongoose.PipelineStage[] = [];

  // ALL = the normal management surface: archived tenants live behind their
  // own dedicated filter (archive hides tenants from normal lists by design).
  if (status === "ALL") pipeline.push({ $match: { status: { $in: ["ACTIVE", "SUSPENDED"] } } });
  else pipeline.push({ $match: { status } } );

  // Join the single tenant admin early so search can include admin fields.
  pipeline.push({
    $lookup: {
      from: "users",
      let: { tid: "$_id" },
      pipeline: [
        { $match: { $expr: { $and: [{ $eq: ["$tenantId", "$$tid"] }, { $eq: ["$role", "TENANT_ADMIN"] }] } } },
        { $project: { name: 1, email: 1 } },
        { $limit: 1 },
      ],
      as: "admin",
    },
  });

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    pipeline.push({
      $match: {
        $or: [
          { companyName: regex },
          { slug: regex },
          { "admin.name": regex },
          { "admin.email": regex },
        ],
      },
    });
  }

  pipeline.push({
    $lookup: {
      from: "packages",
      let: { tid: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$tenantId", "$$tid"] } } },
        { $count: "count" },
      ],
      as: "packageStats",
    },
  });
  pipeline.push({
    $addFields: { packageCount: { $ifNull: [{ $arrayElemAt: ["$packageStats.count", 0] }, 0] } },
  });

  const sortStage: Record<string, 1 | -1> =
    sort === "oldest"
      ? { createdAt: 1 }
      : sort === "most_packages"
        ? { packageCount: -1, createdAt: -1 }
        : sort === "company_name"
          ? { companyName: 1 }
          : { createdAt: -1 };
  pipeline.push({ $sort: sortStage });

  pipeline.push({
    $facet: {
      items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      total: [{ $count: "count" }],
    },
  });

  const [result] = await TenantModel.aggregate<{
    items: TenantListAggregateRow[];
    total: Array<{ count: number }>;
  }>(pipeline);

  const total = result?.total[0]?.count ?? 0;
  const items: TenantListItem[] = (result?.items ?? []).map((row) => ({
    id: String(row._id),
    companyName: row.companyName,
    slug: row.slug,
    status: row.status,
    admin: row.admin?.[0]
      ? { id: String(row.admin[0]._id), name: row.admin[0].name, email: row.admin[0].email }
      : null,
    packageCount: row.packageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/* ── Stats for the platform overview ─────────────────────────────────────── */

export async function getTenantStats(): Promise<TenantStats> {
  const grouped = await TenantModel.aggregate<{ _id: TenantStatus; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const stats: TenantStats = { total: 0, active: 0, suspended: 0, archived: 0 };
  for (const row of grouped) {
    stats.total += row.count;
    if (row._id === "ACTIVE") stats.active = row.count;
    if (row._id === "SUSPENDED") stats.suspended = row.count;
    if (row._id === "ARCHIVED") stats.archived = row.count;
  }
  return stats;
}

/** Platform overview metrics: tenant lifecycle counts + package totals. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [tenants, packageGroups] = await Promise.all([
    getTenantStats(),
    PackageModel.aggregate<{ _id: PackageStatus; count: number }>([
      { $match: { archived: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  let totalPackages = 0;
  let delivered = 0;
  for (const row of packageGroups) {
    totalPackages += row.count;
    if (row._id === "DELIVERED") delivered += row.count;
  }
  return {
    tenants,
    packages: {
      total: totalPackages,
      // "Active shipments" = everything not yet delivered (five locked statuses).
      activeShipments: totalPackages - delivered,
      delivered,
    },
  };
}

/**
 * Platform-Admin read of ONE tenant's packages — the data path behind
 * "Open tenant dashboard". Explicitly scoped to the requested tenantId
 * (never a broadcast query) and read-only: package mutations stay with
 * the tenant's own admin surface.
 */
export async function listPackagesForTenant(
  tenantId: string,
  options: { page?: number; limit?: number } = {},
): Promise<Paginated<TenantPackageSummary>> {
  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) throw apiErrors.tenantNotFound();

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const filter = { tenantId: tenant._id, archived: false };

  const [total, rows] = await Promise.all([
    PackageModel.countDocuments(filter),
    PackageModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  return {
    items: rows.map((row) => ({
      id: String(row._id),
      trackingId: row.trackingId,
      packageName: row.packageName,
      status: row.status,
      receiverName: row.receiver?.name ?? "",
      currentLocationName: row.currentLocation?.locationName ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/* ── Details ─────────────────────────────────────────────────────────────── */

export async function getTenantDetails(tenantId: string): Promise<TenantDetails> {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw apiErrors.tenantNotFound();

  const [admin, packageCount, websiteConfig] = await Promise.all([
    UserModel.findOne({ tenantId: tenant._id, role: "TENANT_ADMIN" }).lean(),
    PackageModel.countDocuments({ tenantId: tenant._id }),
    WebsiteConfigModel.exists({ tenantId: tenant._id }),
  ]);

  return {
    tenant: toTenantDetailsTenant(tenant),
    admin: admin
      ? {
          id: String(admin._id),
          name: admin.name,
          email: admin.email,
          status: admin.status,
          createdAt: admin.createdAt.toISOString(),
        }
      : null,
    packageCount,
    websiteConfigured: Boolean(websiteConfig),
  };
}

/* ── Edit ────────────────────────────────────────────────────────────────── */

export async function updateTenant(tenantId: string, patch: UpdateTenantInput): Promise<TenantDetails> {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw apiErrors.tenantNotFound();

  if (patch.companyName !== undefined) tenant.companyName = patch.companyName;
  if (patch.contact !== undefined) {
    tenant.contact = {
      ...(patch.contact.phone !== undefined ? { phone: patch.contact.phone } : {}),
      ...(patch.contact.email !== undefined ? { email: patch.contact.email } : {}),
      ...(patch.contact.address !== undefined ? { address: patch.contact.address } : {}),
    };
  }
  if (patch.slug !== undefined) {
    const slug = await assertSlugUsable(patch.slug, tenantId);
    tenant.slug = slug;
  }

  try {
    await tenant.save();
  } catch (error) {
    throw mapDuplicateError(error, { slug: tenant.slug, email: "" });
  }
  log.info({ tenantId, changed: Object.keys(patch) }, "tenant updated");
  return getTenantDetails(tenantId);
}

/* ── Lifecycle ───────────────────────────────────────────────────────────── */

const TENANT_TRANSITIONS: Record<"suspend" | "archive" | "restore", { from: TenantStatus[]; to: TenantStatus }> = {
  suspend: { from: ["ACTIVE"], to: "SUSPENDED" },
  archive: { from: ["ACTIVE"], to: "ARCHIVED" },
  restore: { from: ["SUSPENDED", "ARCHIVED"], to: "ACTIVE" },
};

export type TenantLifecycleAction = keyof typeof TENANT_TRANSITIONS;

export async function transitionTenant(
  tenantId: string,
  action: TenantLifecycleAction,
): Promise<TenantDetails> {
  const tenant = await TenantModel.findById(tenantId);
  if (!tenant) throw apiErrors.tenantNotFound();

  const rule = TENANT_TRANSITIONS[action];
  if (!rule.from.includes(tenant.status)) {
    throw apiErrors.invalidTenantStatus(
      `Cannot ${action} a tenant in status ${tenant.status} (allowed from: ${rule.from.join(", ")}).`,
    );
  }

  tenant.status = rule.to;
  await tenant.save();

  // Suspension/archival takes effect NOW, not at session expiry: destroy the
  // tenant's live sessions (Phase 3 also re-checks status per request).
  if (action !== "restore") {
    const destroyed = await SessionModel.deleteMany({ tenantId: tenant._id });
    log.warn({ tenantId, action, invalidated: destroyed.deletedCount }, "tenant lifecycle transition — sessions invalidated");
  } else {
    log.info({ tenantId, action }, "tenant restored to ACTIVE");
  }

  return getTenantDetails(tenantId);
}

/* ── Tenant admin password reset ─────────────────────────────────────────── */

export async function resetTenantAdminPassword(tenantId: string): Promise<PasswordResetResult> {
  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) throw apiErrors.tenantNotFound();

  const admin = await UserModel.findOne({ tenantId: tenant._id, role: "TENANT_ADMIN" }).select("+passwordHash");
  if (!admin) throw apiErrors.notFound("This tenant has no tenant admin account.");

  // Generate → hash → replace → invalidate sessions. Existing password is
  // never retrievable; the temporary password leaves the server exactly once.
  const temporaryPassword = generateTemporaryPassword();
  admin.passwordHash = await hashPassword(temporaryPassword);
  await admin.save();

  const destroyed = await SessionModel.deleteMany({ userId: admin._id });
  log.info({ tenantId, adminId: admin.id, invalidated: destroyed.deletedCount }, "tenant admin password reset — sessions invalidated");

  return {
    admin: { id: String(admin._id), name: admin.name, email: admin.email },
    temporaryPassword,
  };
}
