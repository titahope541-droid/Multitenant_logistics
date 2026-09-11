/**
 * Model/index verification (development tooling — no DB server required).
 * Loads every model definition and prints declared indexes.
 * Usage: npx tsx scripts/verify-models.ts
 */
import { MODELS } from "../src/db/models";

interface IndexSpec {
  keys: Record<string, unknown>;
  options: { unique?: boolean; partialFilterExpression?: Record<string, unknown> };
}

function describe(model: (typeof MODELS)[number]) {
  const schema = (model as unknown as { schema: { indexes(): [Record<string, unknown>, Record<string, unknown>][] } }).schema;
  return schema
    .indexes()
    .map(([keys, options]: [Record<string, unknown>, IndexSpec["options"]]) => {
      const flags = [options.unique ? "UNIQUE" : null, options.partialFilterExpression ? "PARTIAL" : null]
        .filter(Boolean)
        .join("+");
      return `${JSON.stringify(keys)}${flags ? ` ${flags}` : ""}`;
    })
    .join("  ·  ");
}

let failures = 0;
for (const model of MODELS) {
  const name = model.collection.name;
  if (!name) failures += 1;
  console.log(name.padEnd(18), describe(model));
}
console.log(failures === 0 ? "\nVERIFY OK — 6 models load, indexes declared." : "\nVERIFY FAILED");
process.exit(failures === 0 ? 0 : 1);
