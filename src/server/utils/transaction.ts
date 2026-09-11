/**
 * Transaction runner — shared multi-document write helper.
 *
 * Package flows (create + initial status event, status change + event,
 * location change + history) must be all-or-nothing. This helper runs
 * `work` inside a real MongoDB transaction on replica-set/Atlas
 * deployments, and transparently falls back to sequential execution with
 * caller-supplied compensation on standalone mongod (which does not
 * support transactions) — the same documented strategy as Phase 4
 * (docs/database.md §9).
 */

import mongoose, { type ClientSession } from "mongoose";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("db");

function isTransactionsUnsupported(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return (
    text.includes("Transaction numbers are only allowed") ||
    text.includes("Transactions are not supported") ||
    text.includes("replica set member or mongos")
  );
}

export interface AtomicOptions<T> {
  /** The writes to perform. `session` is a real ClientSession on
   *  transactional deployments and `undefined` in fallback mode. */
  work: (session?: ClientSession) => Promise<T>;
  /** Fallback-mode cleanup when a mid-sequence write fails (no-op if the
   *  flow is trivially repairable or single-documented). */
  compensate?: (failedStepError: unknown) => Promise<void>;
  /** Label for the fallback log line (which flow degraded). */
  label: string;
}

export async function executeAtomically<T>(options: AtomicOptions<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await options.work(session);
    });
    return result;
  } catch (error) {
    if (!isTransactionsUnsupported(error)) throw error;
    log.warn({ flow: options.label }, "transactions unavailable — sequential fallback engaged");
    try {
      return await options.work(undefined);
    } catch (fallbackError) {
      if (options.compensate) {
        await options.compensate(fallbackError).catch(() => undefined);
      }
      throw fallbackError;
    }
  } finally {
    await session.endSession();
  }
}
