/**
 * Website configuration controller — PLATFORM ADMIN ONLY.
 * Thin adapters; all logic in the website service. Routes attach the
 * PLATFORM_ADMIN role gate, so a Tenant Admin never reaches these bodies.
 */

import type { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/server/http/read-json";
import { ok } from "@/server/http/respond";
import * as websiteService from "@/server/services/website.service";
import { validate } from "@/server/validators";
import { tenantIdParamSchema } from "@/server/validators/tenant.validators";
import {
  brandingUpdateSchema,
  websiteUpdateSchema,
} from "@/server/validators/website-config.validators";

function tenantIdFrom(params: { tenantId: string }): string {
  return validate(tenantIdParamSchema, params.tenantId);
}

/* GET /api/v1/platform/tenants/:tenantId/website */
export async function getWebsiteController(
  _request: NextRequest,
  params: { tenantId: string },
): Promise<NextResponse> {
  const config = await websiteService.getWebsiteConfig(tenantIdFrom(params));
  return ok(config);
}

/* PATCH /api/v1/platform/tenants/:tenantId/website */
export async function updateWebsiteController(
  request: NextRequest,
  params: { tenantId: string },
): Promise<NextResponse> {
  const draft = validate(websiteUpdateSchema, await readJsonBody(request));
  const config = await websiteService.updateWebsiteConfig(tenantIdFrom(params), draft);
  return ok(config, { message: "Website configuration saved. The public site reflects it immediately." });
}

/* GET /api/v1/platform/tenants/:tenantId/branding */
export async function getBrandingController(
  _request: NextRequest,
  params: { tenantId: string },
): Promise<NextResponse> {
  const config = await websiteService.getWebsiteConfig(tenantIdFrom(params));
  return ok({ branding: config.branding });
}

/* PATCH /api/v1/platform/tenants/:tenantId/branding */
export async function updateBrandingController(
  request: NextRequest,
  params: { tenantId: string },
): Promise<NextResponse> {
  const branding = validate(brandingUpdateSchema, await readJsonBody(request));
  const config = await websiteService.updateWebsiteConfig(tenantIdFrom(params), { branding });
  return ok({ branding: config.branding }, { message: "Branding saved." });
}
