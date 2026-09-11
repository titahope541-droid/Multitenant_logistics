/**
 * Socket.IO server — attached to THE SAME Node HTTP server that serves
 * Next (server.ts). One process, one port, one lifecycle:
 *
 *   Node HTTP server
 *      ├── Next request handler  (everything, /api/* included)
 *      └── Socket.IO             (/socket.io path only)
 *
 * Security wiring (docs/realtime.md §6):
 *   · handshake origin allow-list (same rules as HTTP mutations)
 *   · optional-auth enrichment: a valid session cookie upgrades a socket
 *     to its owner's identity (used for admin tenant rooms)
 *   · every room join is authorized server-side — never client-declared
 *   · broadcast-only: sockets expose no write operations
 */

import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { ApiError, apiErrors } from "@/server/http/errors";
import { isOriginAllowed } from "@/server/middleware/security";
import {
  REALTIME_EVENTS,
  tenantRoom,
  trackingRoom,
  type PackageErrorPayload,
  type PackageSubscribePayload,
} from "@/server/realtime/events";
import { setSocketServer } from "@/server/realtime/registry";
import { authorizeTrackingSubscription } from "@/server/realtime/subscription.service";
import { resolveSessionByToken } from "@/server/services/auth.service";
import { resolveTenantFromHostHeader } from "@/server/services/tenant-resolution.service";
import { SESSION_COOKIE_NAME } from "@/server/utils/session-token";
import { getLogger } from "@/server/utils/logger";
import type { UserRole } from "@/types/domain";

const log = getLogger("realtime");

export interface SocketAuthData {
  userId: string;
  role: UserRole;
  tenantId: string | null;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index > 0) out[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
  }
  return out;
}

function mapToPackageError(error: unknown): PackageErrorPayload {
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_ERROR") return { code: "VALIDATION_ERROR", message: error.message };
    if (error.code === "PACKAGE_NOT_FOUND") return { code: "PACKAGE_NOT_FOUND", message: error.message };
    if (error.code === "TENANT_SUSPENDED") return { code: "TENANT_SUSPENDED", message: "Tracking is temporarily unavailable." };
    if (error.code === "TENANT_ARCHIVED") return { code: "TENANT_ARCHIVED", message: "Tracking is temporarily unavailable." };
  }
  log.error({ err: error }, "subscription failed unexpectedly");
  return { code: "INTERNAL_ERROR", message: "Subscription failed. Please retry." };
}

type SubscribeAck = (response: { ok: boolean; error?: PackageErrorPayload }) => void;

function registerSubscribeHandler(socket: Socket): void {
  socket.on(REALTIME_EVENTS.PACKAGE_SUBSCRIBE, async (payload: PackageSubscribePayload, ack?: SubscribeAck) => {
    try {
      const resolution = await resolveTenantFromHostHeader(socket.handshake.headers.host ?? null);
      if (resolution.kind !== "tenant") {
        throw apiErrors.tenantNotFound("This website does not exist.");
      }
      const trackingId = String(payload?.trackingId ?? "");
      await authorizeTrackingSubscription(resolution.tenant, trackingId);

      const normalized = trackingId.trim().toUpperCase();
      await socket.join(trackingRoom(normalized));
      const rooms = (socket.data.trackingRooms ??= new Set<string>()) as Set<string>;
      rooms.add(normalized);

      log.info({ trackingId: normalized, tenant: resolution.tenant.slug }, "socket joined tracking room");
      ack?.({ ok: true });
      socket.emit(REALTIME_EVENTS.PACKAGE_SUBSCRIBED, { trackingId: normalized });
    } catch (error) {
      const mapped = mapToPackageError(error);
      ack?.({ ok: false, error: mapped });
      socket.emit(REALTIME_EVENTS.PACKAGE_ERROR, mapped);
    }
  });
}

export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    serveClient: false,
    // Same-origin deployment: credentials ride only on allowed origins.
    cors: { origin: (origin, callback) => callback(null, !origin || isOriginAllowed(origin)), credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const origin = socket.handshake.headers.origin;
      if (origin && !isOriginAllowed(origin)) {
        next(new Error("origin not allowed"));
        return;
      }
      // Optional session enrichment — a valid cookie upgrades this socket
      // to its owner's identity; absence means a PUBLIC socket (fine).
      const token = parseCookies(socket.handshake.headers.cookie)[SESSION_COOKIE_NAME];
      if (token) {
        const auth = await resolveSessionByToken(token).catch(() => null);
        if (auth) {
          const data: SocketAuthData = {
            userId: auth.user.id,
            role: auth.user.role,
            tenantId: auth.user.tenantId,
          };
          socket.data.auth = data;
        }
      }
      next();
    } catch (error) {
      log.error({ err: error }, "socket handshake failed");
      next(new Error("handshake failed"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth as SocketAuthData | undefined;
    if (auth?.role === "TENANT_ADMIN" && auth.tenantId) {
      void socket.join(tenantRoom(auth.tenantId));
      log.info({ userId: auth.userId, tenantId: auth.tenantId }, "admin socket joined tenant room");
    }
    registerSubscribeHandler(socket);

    socket.on("disconnect", () => {
      // Rooms are released by Socket.IO automatically; nothing to persist.
    });
  });

  setSocketServer(io);
  log.info("socket.io attached to the shared http server (path /socket.io)");
  return io;
}
