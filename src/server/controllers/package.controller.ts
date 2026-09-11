/**
 * Package controller — thin HTTP adapters for the tenant-admin package
 * endpoints. Runs only after the TENANT_ADMIN gate; logic is in the
 * package service; tenantId comes exclusively from the AuthContext.
 */

import type { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/server/http/read-json";
import { ok } from "@/server/http/respond";
import type { AuthContext } from "@/server/middleware/auth";
import * as packageService from "@/server/services/package.service";
import { validate } from "@/server/validators";
import {
  changePackageStatusSchema,
  createPackageSchema,
  listPackagesQuerySchema,
  packageIdParamSchema,
  updateLocationSchema,
} from "@/server/validators/package.validators";

function packageIdFrom(params: { packageId: string }): string {
  return validate(packageIdParamSchema, params.packageId);
}

export async function listPackagesController(
  request: NextRequest,
  auth: AuthContext,
): Promise<NextResponse> {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = validate(listPackagesQuerySchema, raw);
  const result = await packageService.listPackages(auth, {
    ...query,
    archived: query.archived === "true" ? true : undefined,
  });
  return ok(result);
}

export async function createPackageController(
  request: NextRequest,
  auth: AuthContext,
): Promise<NextResponse> {
  const input = validate(createPackageSchema, await readJsonBody(request));
  const result = await packageService.createPackage(auth, input);
  return ok(result, {
    status: 201,
    message: "Package created. Send this tracking ID to your customer.",
  });
}

export async function getPackageDetailsController(
  _request: NextRequest,
  params: { packageId: string },
  auth: AuthContext,
): Promise<NextResponse> {
  const details = await packageService.getPackageDetails(auth, packageIdFrom(params));
  return ok(details);
}

export async function changeStatusController(
  request: NextRequest,
  params: { packageId: string },
  auth: AuthContext,
): Promise<NextResponse> {
  const input = validate(changePackageStatusSchema, await readJsonBody(request));
  const details = await packageService.changeStatus(auth, packageIdFrom(params), input);
  return ok(details, { message: `Status updated to ${input.status.replaceAll("_", " ")}.` });
}

export async function updateLocationController(
  request: NextRequest,
  params: { packageId: string },
  auth: AuthContext,
): Promise<NextResponse> {
  const input = validate(updateLocationSchema, await readJsonBody(request));
  const details = await packageService.updateLocation(auth, packageIdFrom(params), input);
  return ok(details, { message: "Location updated." });
}

export async function archivePackageController(
  _request: NextRequest,
  params: { packageId: string },
  auth: AuthContext,
): Promise<NextResponse> {
  const details = await packageService.setPackageArchived(auth, packageIdFrom(params), true);
  return ok(details, { message: "Package archived. All history and data are retained." });
}

export async function restorePackageController(
  _request: NextRequest,
  params: { packageId: string },
  auth: AuthContext,
): Promise<NextResponse> {
  const details = await packageService.setPackageArchived(auth, packageIdFrom(params), false);
  return ok(details, { message: "Package restored." });
}
