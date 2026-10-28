/** A turning ring. Pair it with words ("Signing you in…"): the ring alone says nothing to a screen reader. */
export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`spinner ${className}`} aria-hidden="true" />;
}

/** The label that goes inside a button while it works, with the words a screen reader should hear. */
export function Busy({ children }: { children: React.ReactNode }) {
  return <><Spinner /><span>{children}</span></>;
}
