"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/SiteChrome";
import { useMe } from "@/lib/useMe";

const NAV = [["Dashboard", "/dashboard"], ["Calls", "/my-opportunities"], ["Hours", "/hours"], ["Certificates", "/certificates"], ["Chat", "/chat"], ["Guides", "/guides"], ["Profile", "/profile"]] as const;

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me } = useMe();
  return (
    <div className="grain min-h-screen">
      <header className="border-b border-ink bg-paper sticky top-0 z-40">
        <div className="mx-auto max-w-[1300px] px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Wordmark />
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="hidden sm:inline">{me ? `${me.first} ${me.last}` : "Guest"}</span>
            <Link href="/" className="underline">Public site</Link>
          </div>
        </div>
        <nav aria-label="Volunteer" className="mx-auto max-w-[1300px] px-2 md:px-8 flex overflow-x-auto">
          {NAV.map(([l, h]) => (
            <Link key={h} href={h} className={`px-3 md:px-4 min-h-12 grid place-items-center font-bold border-b-4 whitespace-nowrap ${path.startsWith(h) ? "border-orange" : "border-transparent hover:border-ink"}`}>{l}</Link>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-[1300px] px-4 md:px-8 py-8 md:py-12">{children}</main>
    </div>
  );
}
