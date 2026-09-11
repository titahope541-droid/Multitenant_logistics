/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MERIDIAN — MongoDB connection architecture (Mongoose ODM)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * MongoDB is the project's database and Mongoose is the ODM. V1 uses one
 * shared MongoDB database with strict tenant isolation enforced by the
 * backend (docs/database.md).
 *
 * PHASE 1 SCOPE — connection architecture ONLY:
 *
 *   · reads MONGODB_URI from the environment — never hardcoded
 *     (docs/environment.md)
 *   · connects lazily, with the connection cached on globalThis so dev
 *     hot-reloads never exhaust the connection pool
 *   · short server-selection timeout so the health probe fails fast instead
 *     of hanging when MongoDB is unreachable
 *   · buffering disabled — callers receive a real connection error rather
 *     than a long queue stall
 *   · structured connection-state logging via pino (docs/backend.md §6)
 *   · pingDatabase() helper powering GET /api/health
 *   · graceful shutdown on SIGINT / SIGTERM
 *
 * Business models are deliberately NOT defined here yet. The planned
 * collections — tenants, users, packages, status_events, location_history,
 * website_configs (and NO Customer collection) — arrive in Phase 2 as one
 * Mongoose model per module under src/db/. See docs/database.md §2.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import { getServerConfig } from "@/server/config/env";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("db");

interface MongooseCache {
  connection: typeof mongoose | null;
  pending: Promise<typeof mongoose> | null;
  eventsBound: boolean;
  shutdownBound: boolean;
}

const globalForMongoose = globalThis as typeof globalThis & {
  __meridianMongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose.__meridianMongooseCache ?? {
    connection: null,
    pending: null,
    eventsBound: false,
    shutdownBound: false,
  };

globalForMongoose.__meridianMongooseCache = cache;

/** Log connection lifecycle transitions exactly once per process. */
function bindConnectionEvents(): void {
  if (cache.eventsBound) return;
  cache.eventsBound = true;
  mongoose.connection.on("connected", () =>
    log.info({ host: mongoose.connection.host }, "mongodb connected"),
  );
  mongoose.connection.on("disconnected", () => log.warn("mongodb disconnected"));
  mongoose.connection.on("reconnected", () => log.info("mongodb reconnected"));
  mongoose.connection.on("error", (error) =>
    log.error({ err: error }, "mongodb connection error"),
  );
}

/** Close the pool on process termination instead of dropping sockets. */
function bindGracefulShutdown(): void {
  if (cache.shutdownBound) return;
  cache.shutdownBound = true;
  const shutdown = (signal: "SIGINT" | "SIGTERM") => {
    void (async () => {
      try {
        await mongoose.disconnect();
        log.info({ signal }, "mongodb connection closed gracefully");
      } finally {
        process.exit(0);
      }
    })();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

/**
 * Establish (or reuse) the shared Mongoose connection.
 *
 * Throws when MONGODB_URI is missing or MongoDB is unreachable — callers
 * such as the health service convert that into a truthful "down" report
 * rather than letting the process crash-loop.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection) return cache.connection;

  const uri = getServerConfig().mongodbUri;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. See docs/environment.md.");
  }

  bindConnectionEvents();
  bindGracefulShutdown();

  cache.pending ??= mongoose
    .connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500,
      maxPoolSize: 10,
      // Index builds are explicit (src/db/ensure-indexes.ts), never implicit
      // at boot — per-connection autoIndex is a production anti-pattern.
      autoIndex: false,
    })
    .then(async (instance) => {
      log.info("mongodb connection established");
      if (!getServerConfig().isProduction) {
        const { ensureAllIndexes } = await import("@/db/ensure-indexes");
        await ensureAllIndexes();
        log.info("mongodb indexes ensured (development)");
      } else {
        log.info("mongodb connected (indexes ensured via deployment step)");
      }
      return instance;
    })
    .catch((error: unknown) => {
      cache.pending = null; // allow the next request to retry
      log.error({ err: error }, "mongodb connection failed");
      throw error;
    });

  cache.connection = await cache.pending;
  return cache.connection;
}

/** True when the driver currently holds a live connection. */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

/**
 * Liveness probe used by the health service: a real round trip against the
 * server (`ping`), timed. Throws when unreachable.
 */
export async function pingDatabase(): Promise<number> {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection handle unavailable");
  const startedAt = performance.now();
  await db.admin().command({ ping: 1 });
  return Math.max(0, Math.round(performance.now() - startedAt));
}

/** Graceful close — invoked by the shutdown handler and by future tooling. */
export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
  }
  cache.connection = null;
}
