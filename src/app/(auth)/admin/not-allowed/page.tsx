import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { authState } from "@/lib/auth/session";

export const metadata = { title: "Not allowed" };

// Server-rendered, so it shows no matter what the browser does. Shows nothing personal.
export default async function NotAllowed() {
  const s = await authState();
  return (
    <>
      <p className="display text-6xl">Not allowed.</p>
      <p className="mt-4 text-lg">This page is not for your account.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {s.signedIn ? <Link className="btn" href={s.admin ? "/admin" : "/dashboard"}>{s.admin ? "Back to the admin dashboard" : "Go to my dashboard"}</Link> : <Link className="btn" href="/login">Sign in</Link>}
        {s.signedIn && <SignOutButton className="btn btn-ghost" />}
      </div>
    </>
  );
}
