/**
 * The API error model.
 *
 * Every deliberate failure the API emits is an `ApiError`, rendered by
 * `respond.ts` into the standard error envelope from docs/api.md §3:
 *
 *   { "success": false, "error": { "code": "…", "message": "…" } }
 *
 * Codes are machine-stable; clients branch on `code`, humans read `message`.
 * The registry mirrors docs/api.md §4 — keep both in sync (consistency rule).
 */

export const API_ERROR_CODES = [
  "INTERNAL_ERROR",
  "NOT_IMPLEMENTED",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "TENANT_SUSPENDED",
  "TENANT_ARCHIVED",
  "NOT_FOUND",
  "TENANT_NOT_FOUND",
  "PACKAGE_ARCHIVED",
  "INVALID_PACKAGE_STATUS",
  "INVALID_LOCATION",
  "TRACKING_ID_GENERATION_FAILED",
  "TENANT_SLUG_ALREADY_EXISTS",
  "TENANT_SLUG_RESERVED",
  "TENANT_ADMIN_ALREADY_EXISTS",
  "EMAIL_ALREADY_EXISTS",
  "INVALID_TENANT_STATUS",
  "PACKAGE_NOT_FOUND",
  "RATE_LIMITED",
  "NOT_READY",
  "UPSTREAM_UNAVAILABLE",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/* Factories keep call-sites terse and codes consistent. */
export const apiErrors = {
  internal: (message = "An unexpected error occurred."): ApiError =>
    new ApiError(500, "INTERNAL_ERROR", message),
  validation: (message = "The request could not be validated."): ApiError =>
    new ApiError(400, "VALIDATION_ERROR", message),
  unauthorized: (message = "Authentication is required."): ApiError =>
    new ApiError(401, "UNAUTHORIZED", message),
  invalidCredentials: (message = "Invalid email or password."): ApiError =>
    new ApiError(401, "INVALID_CREDENTIALS", message),
  accountSuspended: (message = "This account is suspended."): ApiError =>
    new ApiError(403, "ACCOUNT_SUSPENDED", message),
  tenantSuspended: (message = "This workspace is suspended. Contact the platform operator."): ApiError =>
    new ApiError(403, "TENANT_SUSPENDED", message),
  tenantArchived: (message = "This workspace is archived. Contact the platform operator."): ApiError =>
    new ApiError(403, "TENANT_ARCHIVED", message),
  forbidden: (message = "You do not have access to this resource."): ApiError =>
    new ApiError(403, "FORBIDDEN", message),
  notFound: (message = "The requested resource was not found."): ApiError =>
    new ApiError(404, "NOT_FOUND", message),
  tenantNotFound: (message = "Tenant could not be found."): ApiError =>
    new ApiError(404, "TENANT_NOT_FOUND", message),
  tenantSlugTaken: (message = "That subdomain is already in use."): ApiError =>
    new ApiError(409, "TENANT_SLUG_ALREADY_EXISTS", message),
  tenantSlugReserved: (message = "That subdomain is reserved."): ApiError =>
    new ApiError(400, "TENANT_SLUG_RESERVED", message),
  tenantAdminExists: (message = "This tenant already has a tenant admin."): ApiError =>
    new ApiError(409, "TENANT_ADMIN_ALREADY_EXISTS", message),
  emailTaken: (message = "That email is already in use."): ApiError =>
    new ApiError(409, "EMAIL_ALREADY_EXISTS", message),
  invalidTenantStatus: (message: string): ApiError =>
    new ApiError(400, "INVALID_TENANT_STATUS", message),
  packageNotFound: (message = "Package could not be found."): ApiError =>
    new ApiError(404, "PACKAGE_NOT_FOUND", message),
  packageArchived: (message = "This package is archived. Restore it before making changes."): ApiError =>
    new ApiError(400, "PACKAGE_ARCHIVED", message),
  invalidPackageStatus: (message = "Status must be one of the five valid package statuses."): ApiError =>
    new ApiError(400, "INVALID_PACKAGE_STATUS", message),
  invalidLocation: (message = "Location coordinates are outside the valid range."): ApiError =>
    new ApiError(400, "INVALID_LOCATION", message),
  trackingIdGenerationFailed: (message = "Could not allocate a tracking ID. Please try again."): ApiError =>
    new ApiError(500, "TRACKING_ID_GENERATION_FAILED", message),
  rateLimited: (message = "Too many requests. Please slow down."): ApiError =>
    new ApiError(429, "RATE_LIMITED", message),
  notImplemented: (message: string): ApiError =>
    new ApiError(501, "NOT_IMPLEMENTED", message),
  notReady: (message = "The service is not ready to accept traffic."): ApiError =>
    new ApiError(503, "NOT_READY", message),
  upstreamUnavailable: (message = "An external service is temporarily unavailable. Please try again."): ApiError =>
    new ApiError(502, "UPSTREAM_UNAVAILABLE", message),
};
