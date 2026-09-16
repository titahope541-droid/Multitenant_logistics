/**
 * Page-level auth helpers for server components.
 *
 * UX-layer redirection only — the API remains the security boundary
 * (docs/security.md). Convenience rule for pages: unauthenticated or
 * wrong-role visitors are bounced to /login before any data loads.
 */

import { cookies } from "next/headers";
import { connectToDatabase } from "@/db";
import { redirect } from "next/navigation";
import {
  resolveSessionByToken,
  type AuthContext,
} from "@/server/services/auth.service";
import { SESSION_COOKIE_NAME } from "@/server/utils/session-token";
import type { UserRole } from "@/types/domain";

export async function getPageAuthContext(): Promise<AuthContext | null> {
  await connectToDatabase().catch(() => undefined);
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await resolveSessionByToken(token);
  } catch {
    return null;
  }
}

/**
 * Server-side page guard. Unauthenticated visitors are sent to the login
 * page; an authenticated user with the WRONG role is sent to their own
 * console — still a server-side refusal, just a friendlier destination.
 */
export async function requirePageRole(role: UserRole): Promise<AuthContext> {
  const context = await getPageAuthContext();
  if (!context) redirect("/login");
  if (context.user.role !== role) {
    redirect(context.user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");
  }
  return context;
}
