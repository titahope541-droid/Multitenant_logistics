/**
 * Auth input validators — IMPLEMENTED IN PHASE 3.
 *
 * Login and change-password request bodies. Password policy rules
 * (min 10 / max 128 / non-blank) live here AND in
 * src/server/utils/password.ts (checkPasswordPolicy) — the zod layer is
 * the first gate; the utility is reused by the seed tooling.
 */

import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/server/utils/password";
import { emailSchema } from "@/server/validators/common";

export const loginSchema = z
  .object({
    email: emailSchema,
    /** Existence/shape check only — never strength-checked at login. */
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `must be at most ${PASSWORD_MAX_LENGTH} characters`)
      .refine((value) => value.trim().length > 0, { message: "must not be blank" }),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
