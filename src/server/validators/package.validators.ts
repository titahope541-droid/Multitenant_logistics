/**
 * Package input validators — request-boundary schemas for the package flows
 * (consumed by Phase 5 Packages + Tracking and Phase 8 Tenant Admin).
 *
 * Deliberately ABSENT from create/update input (server-owned fields):
 *   · trackingId — server-generated in Phase 5; never typed by admins
 *   · status     — starts at PENDING; changes only via the status workflow
 *   · archived   — lifecycle flag set by archive operations
 *   · tenantId   — resolved from the authenticated session, NEVER trusted
 *     from the client (docs/security.md §1)
 */

import { z } from "zod";
import { PACKAGE_STATUSES, PAYMENT_STATUSES } from "@/types/domain";
import { TRACKING_ID_PARAM_PATTERN } from "@/lib/validation-patterns";
import { emailSchema, freeText, objectIdSchema, phoneSchema } from "@/server/validators/common";

/* There is no Customer entity — parties are embedded details. */
export const partySchema = z
  .object({
    name: freeText(120),
    phone: phoneSchema,
    email: emailSchema.optional(),
    address: freeText(300),
  })
  .strict();

export const createPackageSchema = z
  .object({
    packageName: freeText(160),
    description: z.string().trim().max(1000).optional(),
    sender: partySchema,
    receiver: partySchema,
    specifications: z
      .object({
        size: z.string().trim().max(60).optional(),
        weight: z.number().min(0).max(100_000).optional(),
      })
      .strict()
      .optional(),
    payment: z
      .object({
        /** FREE TEXT — deliberately not an enum (locked decision). */
        paymentMethod: freeText(80).optional(),
        paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
        shippingCost: z.number().min(0).optional(),
      })
      .strict()
      .optional(),
    delivery: z
      .object({
        estimatedDeliveryDate: z.coerce.date().optional(),
      })
      .strict()
      .optional(),
    currentLocation: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        locationName: z.string().trim().max(200).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const updatePackageSchema = createPackageSchema.partial();

/* The status workflow input (Phase 5). Sequence is NOT restricted —
 * tenant admins may override with any of the exact five statuses; every
 * change is recorded as a status event (docs/package-management.md). */
export const changePackageStatusSchema = z
  .object({
    status: z.enum(PACKAGE_STATUSES),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/* Location update input (Phase 5). Coordinates from the admin form now;
 * from the map UI in the Maps phase — same schema. */
export const updateLocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationName: z.string().trim().max(200).optional(),
  })
  .strict();

/* List querystring: status filter incl. ALL, archive drawer via archived=true. */
export const listPackagesQuerySchema = z
  .object({
    search: z.string().trim().max(160).optional(),
    status: z.enum(["ALL", ...PACKAGE_STATUSES]).optional(),
    archived: z.literal("true").optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

/** Package path parameter. */
export const packageIdParamSchema = objectIdSchema;

/** Public tracking path parameter — validated live by the Phase-2 stub. */
export const trackingIdParamSchema = z
  .string()
  .trim()
  .regex(TRACKING_ID_PARAM_PATTERN, "invalid tracking ID format");

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type ChangePackageStatusInput = z.infer<typeof changePackageStatusSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
