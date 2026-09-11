/**
 * Validator barrel + the single validation entry point.
 *
 * Controllers call `validate(schema, input)` — on failure it throws a
 * VALIDATION_ERROR ApiError (first issue, human-readable), which
 * withHandler renders into the standard error envelope. On success it
 * returns the parsed (and typed) value. Business logic never sees
 * unvalidated input.
 */

import type { z } from "zod";
import { apiErrors } from "@/server/http/errors";

export function validate<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue && issue.path.length > 0 ? issue.path.join(".") : "input";
    throw apiErrors.validation(`'${path}': ${issue?.message ?? "invalid value"}`);
  }
  return result.data;
}

export * from "@/server/validators/common";
export * from "@/server/validators/tenant.validators";
export * from "@/server/validators/user.validators";
export * from "@/server/validators/package.validators";
export * from "@/server/validators/website-config.validators";
