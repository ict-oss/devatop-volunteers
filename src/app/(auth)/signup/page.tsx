import Link from "next/link";
import { safeNext } from "@/lib/auth/routing";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">Create an <em className="accent">account.</em></h1>
      <p className="mt-4">An account lets you apply, sign up for calls and keep your record. Already have one? <Link href="/login" className="underline font-bold">Sign in</Link>.</p>
      <div className="mt-8"><SignupForm next={safeNext(q.next)} /></div>
    </>
  );
}
