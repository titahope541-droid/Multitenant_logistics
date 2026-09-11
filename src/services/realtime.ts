/**
 * Realtime client service — the single socket factory for the browser.
 *
 * Same-origin connection through the shared HTTP server (/socket.io).
 * One socket per page lifetime max; callers own cleanup via the returned
 * teardown from their hooks — never accumulating listeners.
 */

import { io, type Socket } from "socket.io-client";

export function createRealtimeSocket(): Socket {
  return io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    // Socket.IO handles backoff; reconnection triggers a REST resync.
    reconnection: true,
    reconnectionDelayMax: 5000,
  });
}
