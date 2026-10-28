import { PASSWORD_MIN } from "@/lib/auth/password-rules";

/** Live tick-list under a new password: people see what is still missing before they press the button. */
export function PasswordHints({ password }: { password: string }) {
  const rules: [string, boolean][] = [[`At least ${PASSWORD_MIN} characters`, password.length >= PASSWORD_MIN], ["A letter", /[A-Za-z]/.test(password)], ["A number", /\d/.test(password)]];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Password needs">
      {rules.map(([label, ok]) => <li key={label} className={ok ? "font-bold text-[#0B6E4F]" : "opacity-70"}><span aria-hidden="true">{ok ? "✓" : "○"}</span> {label}<span className="sr-only">{ok ? " (done)" : " (not yet)"}</span></li>)}
    </ul>
  );
}
