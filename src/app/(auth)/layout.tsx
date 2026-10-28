import { Wordmark } from "@/components/SiteChrome";

// Sign-in pages: calm and plain. No motion and no custom cursor (those are for the public site only).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-screen flex flex-col">
      <header className="border-b border-ink bg-paper">
        <div className="mx-auto max-w-[1300px] px-4 md:px-8 h-16 flex items-center justify-between">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="flex-1 mx-auto w-full max-w-xl px-4 md:px-8 py-10 md:py-16">{children}</main>
    </div>
  );
}
