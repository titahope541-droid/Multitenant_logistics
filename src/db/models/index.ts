/**
 * Model registry — the six locked collections, and nothing else.
 *
 * Import models from here ("@/db/models") rather than reaching into files,
 * so the registry stays the single enumeration of what exists in MongoDB.
 * MODELS powers the dev-time index ensuring in src/db/ensure-indexes.ts.
 */

export { TenantModel } from "@/db/models/tenant.model";
export { UserModel } from "@/db/models/user.model";
export { PackageModel } from "@/db/models/package.model";
export { StatusEventModel } from "@/db/models/status-event.model";
export { LocationHistoryModel } from "@/db/models/location-history.model";
export { WebsiteConfigModel } from "@/db/models/website-config.model";
export { SessionModel } from "@/db/models/session.model";

import type { Model } from "mongoose";
import { TenantModel } from "@/db/models/tenant.model";
import { UserModel } from "@/db/models/user.model";
import { PackageModel } from "@/db/models/package.model";
import { StatusEventModel } from "@/db/models/status-event.model";
import { LocationHistoryModel } from "@/db/models/location-history.model";
import { WebsiteConfigModel } from "@/db/models/website-config.model";
import { SessionModel } from "@/db/models/session.model";

/** Structural subset needed to ensure indexes at startup-time. */
export interface IndexedModel {
  modelName: string;
  collection: { name: string };
  createIndexes(): Promise<string>;
}

/** Every registered model. NB: there is deliberately NO Customer model.
 *  `sessions` is an infrastructure collection (Phase 3 session store),
 *  not a business collection. */
export const MODELS: readonly IndexedModel[] = [
  TenantModel as unknown as IndexedModel,
  UserModel as unknown as IndexedModel,
  PackageModel as unknown as IndexedModel,
  StatusEventModel as unknown as IndexedModel,
  LocationHistoryModel as unknown as IndexedModel,
  WebsiteConfigModel as unknown as IndexedModel,
  SessionModel as unknown as IndexedModel,
];
