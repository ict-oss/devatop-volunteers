import { SiteHeader, SiteFooter, ApplyBar, CookieBanner } from "@/components/SiteChrome";
import { Cursor } from "@/components/Cursor";
import { PageMotion } from "@/components/PageMotion";
import { SlotToggle } from "@/components/SlotToggle";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
