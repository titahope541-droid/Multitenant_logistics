/**
 * In-memory MongoDB lifecycle for tests.
 * One server per test file; collections cleared between tests.
 */

import mongoose from "mongoose";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | MongoMemoryReplSet | null = null;

export async function startMemoryMongo(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("meridian_test"));
}

/**
 * Single-node replica set — required for tests that exercise real MongoDB
 * transactions (tenant provisioning), since standalone mongod instances
 * do not support multi-document transactions.
 */
export async function startMemoryReplSet(): Promise<void> {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: "meridian_tx_test" } });
  await mongoose.connect(mongod.getUri());
}

export async function clearMemoryMongo(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

export async function stopMemoryMongo(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}
