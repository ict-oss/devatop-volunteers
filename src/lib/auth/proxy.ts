import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideProxy } from "./routing";

/**
 * Session refresh + optimistic route protection + the 30-minute admin idle timeout (rules in ./routing.ts).
 * Switched on by src/proxy.ts only when AUTH_ENABLED=true, so the clickable prototype keeps working until cutover.
 *
 * This is a first line of defence only. Real checks happen again on the server (requireAdmin) and in the database (RLS).
 */
export async function authProxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // verifies the token's signature (and refreshes it if needed); never trust unverified cookie contents
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const decision = decideProxy({
    path: request.nextUrl.pathname, signedIn: !!claims, aal2: claims?.aal === "aal2",
    lastActive: Number(request.cookies.get("dv_last")?.value ?? 0), now: Date.now(),
  });

  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.to; url.search = "";
    if (decision.next) url.searchParams.set("next", decision.next);
    if (decision.reason) url.searchParams.set("reason", decision.reason);
    if (decision.signOut) await supabase.auth.signOut();
    const out = NextResponse.redirect(url);
    if (decision.signOut) out.cookies.delete("dv_last");
    return out;
  }
  if (decision.touch) {
    response.cookies.set("dv_last", String(Date.now()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|textures/|photos/|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"] };
