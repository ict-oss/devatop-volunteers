import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + optimistic route protection + the 30-minute admin idle timeout.
 * Wired in by src/proxy.ts (one line: `export { authProxy as proxy, config } from "@/lib/auth/proxy"`), which is added
 * at cutover so the clickable prototype keeps working until the pages are moved onto the real backend.
 *
 * This is a first line of defence only. Real checks happen again on the server (requireAdmin) and in the database (RLS).
 */
const IDLE_MS = 30 * 60 * 1000;
const VOLUNTEER_PREFIXES = ["/dashboard", "/my-opportunities", "/hours", "/certificates", "/chat", "/guides", "/profile", "/checkin"];

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
  const path = request.nextUrl.pathname;
  const toLogin = (reason?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/login"; url.search = "";
    url.searchParams.set("next", path);
    if (reason) url.searchParams.set("reason", reason);
    return NextResponse.redirect(url);
  };

  if (path.startsWith("/admin")) {
    if (!claims) return toLogin();
    const last = Number(request.cookies.get("dv_last")?.value ?? 0);
    if (last && Date.now() - last > IDLE_MS) {
      await supabase.auth.signOut();
      const out = toLogin("idle");
      out.cookies.delete("dv_last");
      return out;
    }
    response.cookies.set("dv_last", String(Date.now()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
    if (claims.aal !== "aal2" && !path.startsWith("/admin/two-factor")) {
      const url = request.nextUrl.clone(); url.pathname = "/admin/two-factor"; url.search = "";
      return NextResponse.redirect(url);
    }
  } else if (VOLUNTEER_PREFIXES.some((p) => path === p || path.startsWith(p + "/")) && !claims) {
    return toLogin();
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|textures/|photos/|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"] };
