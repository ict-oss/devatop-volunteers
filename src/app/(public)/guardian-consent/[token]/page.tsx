import { GuardianProto } from "./GuardianProto";
import { GuardianButtons } from "./GuardianButtons";
import { authEnabled } from "@/lib/env";
import { guardianLinkInfo } from "@/lib/services/applications";
import { asVisitor } from "@/lib/server/caller";

export const metadata = { title: "Parent or guardian consent", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const Shell = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-3xl px-4 md:px-8 py-14 md:py-20 min-h-[60vh]">{children}</div>;

// Opened from the email sent to a parent or guardian. The guardian is not signed in: the secret in the link is the proof,
// the database stores only its hash, the link works for 7 days, and the page shows only the minimum.
export default async function GuardianConsentPage({ params }: { params: Promise<{ token: string }> }) {
  if (!authEnabled()) return <GuardianProto />;
  const { token } = await params;
  const info = token.length >= 20 && token.length <= 200 ? await asVisitor((tx) => guardianLinkInfo(tx, token)) : null;

  if (!info || (info.expired && info.decision === "pending")) return (
    <Shell><h1 className="text-[length:var(--text-display)]">Link not <em className="accent">valid.</em></h1>
      <p className="mt-4 text-[length:var(--text-lead)]">This link has expired (they work for 7 days) or was copied wrongly. Ask the young person to send a new one.</p></Shell>
  );
  if (info.decision === "given") return (
    <Shell><span className="stamp stamp-ok text-base">Consent recorded</span><h1 className="text-[length:var(--text-display)] mt-4">Thank <em className="accent">you.</em></h1>
      <p className="mt-4 text-[length:var(--text-lead)] max-w-xl">{info.applicantFirstName} can now finish their application. You can close this page.</p></Shell>
  );
  if (info.decision === "refused") return (
    <Shell><span className="stamp stamp-bad text-base">Consent refused</span><h1 className="text-[length:var(--text-display)] mt-4">Understood.</h1>
      <p className="mt-4 text-[length:var(--text-lead)] max-w-xl">{info.applicantFirstName} will not be able to apply for now. If you change your mind, ask them to send a new link.</p></Shell>
  );
  return (
    <Shell>
      <p className="font-bold uppercase tracking-widest text-sm">Parent or guardian consent</p>
      <h1 className="text-[clamp(2.75rem,8vw,6rem)] mt-2"><em className="accent">{info.applicantFirstName}</em> wants to volunteer</h1>
      <div className="mt-6 grid gap-4 text-[length:var(--text-lead)] max-w-2xl">
        <p>Hello {info.guardianName}. {info.applicantFirstName} has applied to volunteer with Devatop Centre for Africa Development, a youth-led organisation working against human trafficking and abuse. Because they are under 18, we need your permission first.</p>
        <p><b>How we keep young volunteers safe:</b> no young volunteer works alone, none works with children or survivors, every activity has a trained adult lead, and every volunteer signs our safeguarding agreement. You can withdraw consent at any time.</p>
        <p className="text-sm opacity-80">We record your answer with the date and time. We only use your contact details for this consent.</p>
      </div>
      <GuardianButtons token={token} first={info.applicantFirstName} />
    </Shell>
  );
}
