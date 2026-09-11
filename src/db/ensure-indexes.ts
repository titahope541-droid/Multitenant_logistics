/**
 * Index ensuring — development convenience with explicit production story.
 *
 * Mongoose `autoIndex` is disabled in the connection options (index builds
 * on every boot are a production anti-pattern). In development we call
 * `createIndexes()` once after connect so the locally-defined indexes exist
 * without manual steps. In production, `ensureAllIndexes()` is run as a
 * deployment step rather than implicitly at boot (documented for Phase 12
 * in docs/development.md and docs/database.md).
 */

import { MODELS } from "@/db/models";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("db");

/** Call createIndexes() for every registered model; returns collection names. */
export async function ensureAllIndexes(): Promise<string[]> {
  const ensured: string[] = [];
  for (const model of MODELS) {
    await model.createIndexes();
    ensured.push(model.collection.name);
  }
  log.debug({ collections: ensured }, "mongodb indexes ensured");
  return ensured;
}
