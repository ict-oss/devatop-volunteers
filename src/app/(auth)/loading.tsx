import { Spinner } from "@/components/Spinner";

/** Shown while the next page is being prepared on the server. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-24 min-h-[50vh] flex items-start gap-3 text-lg font-bold" role="status" aria-live="polite">
      <Spinner className="mt-1" /> <span>Loading…</span>
    </div>
  );
}
