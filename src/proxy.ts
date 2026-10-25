import { NextResponse, type NextRequest } from "next/server";
import { authProxy } from "@/lib/auth/proxy";

/**
 * Next 16 calls middleware "proxy". Sign-in protection is OFF until AUTH_ENABLED=true (set it in Vercel and .env.local
 * at cutover), so reviewers can keep using the clickable prototype. The matcher must be written out here:
 * Next reads `config` from this file as plain text, so it cannot be re-exported.
 */
export async function proxy(request: NextRequest) {
  if (process.env.AUTH_ENABLED !== "true") return NextResponse.next();
  return authProxy(request);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|textures/|photos/|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"] };
