/**
 * Tenant input validators — request boundary for the platform tenant
 * endpoints (IMPLEMENTED IN PHASE 4, consumed by the tenant controller).
 *
 * `slug` is accepted loose here (raw operator input like "Swift Logistics")
 * and normalized server-side in the service; the final form is validated
 * against the slug pattern + reserved list there.
 */

import { z } from "zod";
import { TENANT_STATUS_FILTERS, TENANT_SORTS } from "@/types/tenant";
import { emailSchema, freeText, objectIdSchema } from "@/server/validators/common";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/server/utils/password";

/* ── Step 1: company information ─────────────────────────────────────────── */

const contactSchema = z
  .object({
    phone: z.string().trim().min(5).max(40).optional(),
    email: emailSchema.optional(),
    address: z.string().trim().max(300).optional(),
  })
  .strict()
  .optional();

/* ── Create (atomic provisioning input) ──────────────────────────────────── */

export const createTenantWithAdminSchema = z
  .object({
    companyName: freeText(120),
    slug: z.string().trim().min(2).max(60),
    contact: contactSchema,
    admin: z
      .object({
        name: freeText(120),
        email: emailSchema,
        /** Optional: server generates a one-time temporary password when absent. */
        password: z
          .string()
          .min(PASSWORD_MIN_LENGTH, `must be at least ${PASSWORD_MIN_LENGTH} characters`)
          .max(PASSWORD_MAX_LENGTH, `must be at most ${PASSWORD_MAX_LENGTH} characters`)
          .refine((value) => value.trim().length > 0, { message: "must not be blank" })
          .optional(),
      })
      .strict(),
  })
  .strict();

/* ── Edit (identity only — status changes flow through lifecycle endpoints) ─ */

export const updateTenantSchema = z
  .object({
    companyName: freeText(120),
    slug: z.string().trim().min(2).max(60),
    contact: contactSchema,
  })
  .strict()
  .partial();

/* ── List querystring ────────────────────────────────────────────────────── */

export const listTenantsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(TENANT_STATUS_FILTERS).optional(),
    sort: z.enum(TENANT_SORTS).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

/* ── Path params ─────────────────────────────────────────────────────────── */

export const tenantIdParamSchema = objectIdSchema;

export type CreateTenantWithAdminInput = z.infer<typeof createTenantWithAdminSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ListTenantsQueryInput = z.infer<typeof listTenantsQuerySchema>;
