/**
 * Small framework-agnostic utilities. Safe on client and server.
 */

/** Join conditional class names without pulling in a dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
