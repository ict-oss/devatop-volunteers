"use client";

/** What a visitor sees if a page fails on our side. It never shows the technical message. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8 py-24 min-h-[60vh]">
      <h1 className="text-[length:var(--text-display)]">Something went <em className="accent">wrong.</em></h1>
      <p className="mt-4 text-[length:var(--text-lead)]">We could not load this page. Please try again in a moment. If it keeps happening, tell Devatop which page you were on.</p>
      <button className="btn mt-6" onClick={reset}>Try again</button>
    </div>
  );
}
