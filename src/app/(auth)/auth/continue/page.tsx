import { redirect } from "next/navigation";
import { authState } from "@/lib/auth/session";
import { landingFor } from "@/lib/auth/routing";

export const metadata = { title: "Signing you in" };

/** Right after the code is accepted: send each person to their own area (admins finish two-factor first). */
export default async function Continue({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await authState();
  if (!s.signedIn) redirect("/login");
  redirect(landingFor({ isAdmin: !!s.admin, aal2: s.aal2, next: (await searchParams).next }));
}
