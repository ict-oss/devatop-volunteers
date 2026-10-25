import { SiteHeader, SiteFooter, ApplyBar, CookieBanner } from "@/components/SiteChrome";
import { Cursor } from "@/components/Cursor";
import { PageMotion } from "@/components/PageMotion";
import { SlotToggle } from "@/components/SlotToggle";
import { LiveProvider } from "@/lib/live";
import { loadLive } from "@/lib/server/live";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const live = await loadLive(); // null in prototype mode
  return (
    <LiveProvider value={live}>
    <div className="grain min-h-screen flex flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
      <ApplyBar />
      <CookieBanner />
      <SlotToggle />
      <Cursor />
      <PageMotion />
    </div>
    </LiveProvider>
  );
}
