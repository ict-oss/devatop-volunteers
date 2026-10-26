import type { NextRequest } from "next/server";
import { authProxy } from "@/lib/auth/proxy";

/**
 * Next 16 calls middleware "proxy". Every request goes through the sign-in guard (src/lib/auth/proxy.ts). The matcher must
 * be written out here: Next reads `config` from this file as plain text, so it cannot be re-exported.
 */
export async function proxy(request: NextRequest) {
  return authProxy(request);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|textures/|photos/|brand/|icons/|video/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|mp4|webm)$).*)"] };
