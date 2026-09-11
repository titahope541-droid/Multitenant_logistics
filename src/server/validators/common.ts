/**
 * Shared validator primitives — zod schemas composed by the per-domain
 * validators. Mirrors the shareable regexes in src/lib/validation-patterns.
 *
 * Why zod (documented choice, docs/backend.md §validators):
 *   · TypeScript-first — the schema IS the input type (single source)
 *   · safeParse composes perfectly with the ApiError envelope
 *   · .strict() rejects unknown keys by default → no field smuggling
 *
 * Where these run: controllers, AFTER auth/tenancy middleware, BEFORE any
 * service call. Backend validation is the real boundary (docs/security.md §6).
 */

import { z } from "zod";
import {
  EMAIL_PATTERN,
  HEX_COLOR_PATTERN,
  HTTP_URL_PATTERN,
  OBJECT_ID_PATTERN,
  SLUG_PATTERN,
} from "@/lib/validation-patterns";

/** 24-char hex ObjectId string (params, foreign references). */
export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_PATTERN, "expected a 24-character ObjectId");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(EMAIL_PATTERN, "must be a valid email address");

export const phoneSchema = z.string().trim().min(5).max(40);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(48)
  .regex(SLUG_PATTERN, "use lowercase letters, numbers, and single hyphens");

export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN, "expected a #hex color");

export const httpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .regex(HTTP_URL_PATTERN, "expected an http(s) URL");

/** Bounded free text — present and non-empty. */
export const freeText = (max: number) => z.string().trim().min(1).max(max);
