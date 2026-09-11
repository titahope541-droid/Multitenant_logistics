/**
 * Geocoding request validators — Phase 7. Server-side mediators only:
 * search queries are bounded, coordinates stay in range; provider inputs
 * never flow as free-form URLs.
 */

import { z } from "zod";

export const geocodingSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(200),
  })
  .strict();

export const geocodingReverseQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  })
  .strict();
