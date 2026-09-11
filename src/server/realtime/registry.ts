/**
 * Socket.IO server registry — a tiny global hand-off between the HTTP
 * server that owns Socket.IO (server.ts) and the service layer that emits
 * events after successful database writes.
 *
 * Why: route handlers must never reach for connection internals; they ask
 * this registry to emit. When no server is attached (unit tests, scripts,
 * `next dev` used without the custom server), emits become harmless
 * no-ops — the database flow is never coupled to socket availability.
 */

import type { Server as SocketIOServer } from "socket.io";

const globalForIo = globalThis as typeof globalThis & {
  __meridianSocketServer?: SocketIOServer;
};

export function setSocketServer(io: SocketIOServer): void {
  globalForIo.__meridianSocketServer = io;
}

export function getSocketServer(): SocketIOServer | null {
  return globalForIo.__meridianSocketServer ?? null;
}

/** Emit to a room if (and only if) a Socket.IO server is attached. */
export function emitToRoom(room: string, event: string, payload: unknown): boolean {
  const io = getSocketServer();
  if (!io) return false;
  io.to(room).emit(event, payload);
  return true;
}
