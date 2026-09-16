/**
 * Server entry — ONE Node HTTP server hosting the application tier and
 * Socket.IO together (the locked realtime architecture, docs/realtime.md):
 *
 *   Node HTTP server
 *      ├── Next request handler — pages + /api/*
 *      └── Socket.IO            — /socket.io
 *
 * Usage:
 *   npm run dev    → tsx watch server.ts --dev   (development + HMR)
 *   npm run build  → next build
 *   npm start      → tsx server.ts               (production)
 */

/* Must be the FIRST import: installs runtime globals (AsyncLocalStorage,
   WebSocket) that Next's production server expects the `next start` CLI
   to have prepared — a custom server prepares them itself. */
import "next/dist/server/node-environment-baseline";

import { createServer } from "node:http";
import next from "next";
import { connectToDatabase } from "@/db";
import { getSocketServer } from "@/server/realtime/registry";
import { attachSocketServer } from "@/server/realtime/socket-server";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("server");

const dev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
const port = Number(process.env.PORT ?? 3000);
const hostname = "0.0.0.0";

async function main(): Promise<void> {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  // Open the MongoDB pool before serving. Failure is non-fatal: the
  // process still boots so /api/health answers and /api/ready reports
  // the dependency as down (docs/deployment.md §lifecycle).
  await connectToDatabase().catch((error: unknown) => {
    log.error({ err: error }, "initial mongodb connection failed — continuing, readiness will report down");
  });

  const server = createServer((req, res) => handle(req, res));

  attachSocketServer(server);

  server.listen(port, hostname, () => {
    log.info({ port, dev }, `meridian ready — http + socket.io on the same server`);
  });

  /* Graceful shutdown (docs/deployment.md §lifecycle):
       1 stop accepting new connections (server.close)
       2 close Socket.IO transports/rooms
       3 let in-flight requests finish
       4 MongoDB pool closes via the db layer's own handler
       5 exit — PM2 brings the process back if needed */
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      log.info({ signal }, "graceful shutdown initiated");
      try {
        getSocketServer()?.close();
        log.info("socket.io closed");
      } catch (error) {
        log.warn({ err: error }, "socket.io close failed — continuing shutdown");
      }
      server.close(() => {
        server.closeIdleConnections?.();
        process.exit(0);
      });
      // never hang on half-open connections
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
}

void main().catch((error) => {
  log.error({ err: error }, "server failed to start");
  process.exit(1);
});
