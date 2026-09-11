/**
 * Structured logging — pino.
 *
 * One shared logger for the entire server tier. Modules create child
 * loggers with a `module` field; output is structured JSON in production
 * and pretty-printed in development.
 *
 * Rules (docs/backend.md §6):
 *   - server tier uses this logger, never console.*
 *   - secrets/auth material is redacted by configuration
 *   - level controlled by LOG_LEVEL (docs/environment.md)
 */

import { pino, type Logger } from "pino";
import { getServerConfig } from "@/server/config/env";

const config = getServerConfig();

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "password",
  "*.password",
  "*.token",
  "*.secret",
  "*.sessionSecret",
];

export const logger: Logger = pino({
  name: "meridian-api",
  level: config.isProduction ? config.logLevel : (process.env.LOG_LEVEL ?? "debug"),
  base: { service: "meridian-api", environment: config.nodeEnv },
  redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,service,environment",
          },
        },
      }),
});

/** Create a child logger scoped to a module name. */
export function getLogger(module: string): Logger {
  return logger.child({ module });
}
