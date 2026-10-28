import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth/routing";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">Create an <em className="accent">account.</em></h1>
      <p className="mt-4">Two boxes and you are in. Then we take you straight to the application form.</p>
      <div className="mt-8"><AuthForm initial="create" next={safeNext(q.next)} /></div>
    </>
  );
}
