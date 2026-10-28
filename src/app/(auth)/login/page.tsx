import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth/routing";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const q = await searchParams;
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">Sign <em className="accent">in.</em></h1>
      {q.reason === "idle" && (
        <p className="mt-6 border-2 border-ink p-3 font-bold" role="status">You were signed out after 30 minutes without activity. Sign in again to carry on.</p>
      )}
      <div className="mt-8"><AuthForm initial="signin" next={safeNext(q.next)} /></div>
    </>
  );
}
