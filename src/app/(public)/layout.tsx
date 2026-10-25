import { SiteHeader, SiteFooter, ApplyBar, CookieBanner } from "@/components/SiteChrome";
import { Cursor } from "@/components/Cursor";
import { PageMotion } from "@/components/PageMotion";
import { SlotToggle } from "@/components/SlotToggle";
import { LiveProvider } from "@/lib/live";
import { loadLive } from "@/lib/server/live";
import { authEnabled } from "@/lib/env";
import { authState } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const live = await loadLive(); // null in prototype mode
  // the "show image slots" helper and the image guide are for admins only (a signed-in admin with two-factor); visitors never see them
  const s = authEnabled() ? await authState() : null;
  const isAdmin = !!s?.admin && s.aal2;
  return (
    <LiveProvider value={live}>
    <div className="grain min-h-screen flex flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
      <ApplyBar />
      <CookieBanner />
      {isAdmin && <SlotToggle />}
      <Cursor />
      <PageMotion />
    </div>
    </LiveProvider>
  );
}
