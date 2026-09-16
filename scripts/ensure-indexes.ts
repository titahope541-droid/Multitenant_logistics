/**
 * Production index ensuring — the deployment step (docs/deployment.md).
 *
 * Mongoose autoIndex is OFF by design; indexes are built explicitly.
 * In development this runs automatically after connect; in production
 * run it ONCE per release that changes schema/indexes:
 *
 *   npx tsx scripts/ensure-indexes.ts
 *
 * createIndexes() is idempotent — safe to re-run on every deploy.
 */

import "dotenv/config";
import mongoose from "mongoose";
import { ensureAllIndexes } from "../src/db/ensure-indexes";
import { MODELS } from "../src/db/models";

const uri = process.env.MONGODB_URI;

async function main(): Promise<void> {
  if (!uri) {
    console.error("ensure-indexes: MONGODB_URI is not set (check your .env)");
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const collections = await ensureAllIndexes();
    console.log(`ensure-indexes: ensured indexes on ${MODELS.length} models`);
    for (const name of collections) console.log(`  · ${name}`);
    console.log("ensure-indexes: done");
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error) => {
  console.error(`ensure-indexes: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
