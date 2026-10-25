import Link from "next/link";
import { safeNext } from "@/lib/auth/routing";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const q = await searchParams;
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">Sign <em className="accent">in.</em></h1>
      {q.reason === "idle" && (
        <p className="mt-6 border-2 border-ink p-3 font-bold" role="status">You were signed out after 30 minutes without activity. Sign in again to carry on.</p>
      )}
      <div className="mt-8"><LoginForm next={safeNext(q.next)} /></div>
      <p className="mt-10 text-sm">New here? <Link href="/apply" className="underline font-bold">Become a volunteer</Link></p>
    </>
  );
}
