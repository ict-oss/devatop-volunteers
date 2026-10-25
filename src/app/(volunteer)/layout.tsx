import { VolunteerShell } from "@/components/VolunteerShell";
import { LiveProvider } from "@/lib/live";
import { authEnabled } from "@/lib/env";
import { requireVolunteer } from "@/lib/auth/session";
import { loadLive } from "@/lib/server/live";

/** The volunteer portal. Once AUTH_ENABLED, signed-out visitors are sent to login (rule 3: each person sees only their own records). */
export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  if (authEnabled()) await requireVolunteer();
  const live = await loadLive();
  return <LiveProvider value={live}><VolunteerShell>{children}</VolunteerShell></LiveProvider>;
}
