/**
 * User input validators — request-boundary schemas for account management
 * (consumed by Phase 3 Authentication / Phase 4 Tenant Management).
 *
 * SECURITY RULE pinned here too: `passwordHash` is NEVER client input.
 * A plaintext password is received at the auth boundary (Phase 3), hashed
 * server-side, stored as passwordHash. This schema accepts no password
 * field at all for account administration.
 */

import { z } from "zod";
import { USER_ROLES, USER_STATUSES } from "@/types/domain";
import { emailSchema, freeText, objectIdSchema } from "@/server/validators/common";

export const createUserSchema = z
  .object({
    name: freeText(120),
    email: emailSchema,
    role: z.enum(USER_ROLES),
    /** Role-dependent: null for PLATFORM_ADMIN, required for TENANT_ADMIN. */
    tenantId: objectIdSchema.nullish(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.role === "TENANT_ADMIN" && !value.tenantId) {
      ctx.addIssue({ code: "custom", path: ["tenantId"], message: "required for TENANT_ADMIN" });
    }
    if (value.role === "PLATFORM_ADMIN" && value.tenantId) {
      ctx.addIssue({ code: "custom", path: ["tenantId"], message: "must be null for PLATFORM_ADMIN" });
    }
  });

export const updateUserSchema = z
  .object({
    name: freeText(120),
    status: z.enum(USER_STATUSES),
  })
  .strict()
  .partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
