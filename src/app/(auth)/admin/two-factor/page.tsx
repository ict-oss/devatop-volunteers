import { redirect } from "next/navigation";
import { authState } from "@/lib/auth/session";
import { TwoFactorForm } from "./TwoFactorForm";

export const metadata = { title: "Two-factor sign-in" };

export default async function TwoFactorPage() {
  const s = await authState();
  if (!s.signedIn) redirect("/login?next=/admin");
  if (!s.admin) redirect("/admin/not-allowed"); // only admins have anything to verify
  if (s.aal2) redirect("/admin");
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">One more <em className="accent">step.</em></h1>
      <p className="mt-4 text-lg">Admins sign in with a second check, so a stolen email code is not enough to open the admin area.</p>
      <div className="mt-8"><TwoFactorForm /></div>
    </>
  );
}
