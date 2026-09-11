/**
 * Tenant controller — thin HTTP adapters for the platform tenant endpoints.
 * Every function runs only after the PLATFORM_ADMIN gate (withAuth);
 * all logic lives in the tenant service.
 */

import type { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/server/http/read-json";
import { ok } from "@/server/http/respond";
import type { AuthContext } from "@/server/middleware/auth";
import * as tenantService from "@/server/services/tenant.service";
import { validate } from "@/server/validators";
import {
  createTenantWithAdminSchema,
  listTenantsQuerySchema,
  tenantIdParamSchema,
  updateTenantSchema,
} from "@/server/validators/tenant.validators";
import type { TenantLifecycleAction } from "@/server/services/tenant.service";

function tenantIdFrom(params: { tenantId: string }): string {
  return validate(tenantIdParamSchema, params.tenantId);
}

/* GET /api/v1/platform/tenants */
export async function listTenantsController(request: NextRequest): Promise<NextResponse> {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = validate(listTenantsQuerySchema, raw);
  const result = await tenantService.listTenants(query);
  return ok(result);
}

/* POST /api/v1/platform/tenants */
export async function createTenantController(request: NextRequest): Promise<NextResponse> {
  const input = validate(createTenantWithAdminSchema, await readJsonBody(request));
  const result = await tenantService.createTenantWithAdmin(input);
  return ok(result, { status: 201, message: "Tenant created with its admin and website configuration." });
}

/* GET /api/v1/platform/tenants/:tenantId */
export async function getTenantController(_request: NextRequest, params: { tenantId: string }): Promise<NextResponse> {
  const details = await tenantService.getTenantDetails(tenantIdFrom(params));
  return ok(details);
}

/* PATCH /api/v1/platform/tenants/:tenantId */
export async function updateTenantController(request: NextRequest, params: { tenantId: string }): Promise<NextResponse> {
  const input = validate(updateTenantSchema, await readJsonBody(request));
  const details = await tenantService.updateTenant(tenantIdFrom(params), input);
  return ok(details, { message: "Tenant updated." });
}

/* POST /api/v1/platform/tenants/:tenantId/{suspend,archive,restore} */
export async function transitionTenantController(
  _request: NextRequest,
  params: { tenantId: string },
  action: TenantLifecycleAction,
  _auth: AuthContext,
): Promise<NextResponse> {
  const details = await tenantService.transitionTenant(tenantIdFrom(params), action);
  const messages: Record<TenantLifecycleAction, string> = {
    suspend: "Tenant suspended. Tenant access and sessions are disabled; data is retained.",
    archive: "Tenant archived. It no longer appears in normal lists; data is retained.",
    restore: "Tenant restored to ACTIVE.",
  };
  return ok(details, { message: messages[action] });
}

/* POST /api/v1/platform/tenants/:tenantId/admin/reset-password */
export async function resetAdminPasswordController(
  _request: NextRequest,
  params: { tenantId: string },
): Promise<NextResponse> {
  const result = await tenantService.resetTenantAdminPassword(tenantIdFrom(params));
  return ok(result, {
    message: "Tenant admin password reset. This temporary password is shown once — share it via a secure channel.",
  });
}

/* GET /api/v1/platform/stats — overview metrics (Phase 8) */
export async function platformStatsController(): Promise<NextResponse> {
  const stats = await tenantService.getPlatformStats();
  return ok(stats);
}

/* GET /api/v1/platform/tenants/:tenantId/packages — server-authorized
   Platform-Admin read of one tenant's packages (no impersonation). */
export async function listTenantPackagesController(
  request: NextRequest,
  params: { tenantId: string },
): Promise<NextResponse> {
  const url = request.nextUrl.searchParams;
  const result = await tenantService.listPackagesForTenant(tenantIdFrom(params), {
    page: url.get("page") ? Number(url.get("page")) : undefined,
    limit: url.get("limit") ? Number(url.get("limit")) : undefined,
  });
  return ok(result);
}
