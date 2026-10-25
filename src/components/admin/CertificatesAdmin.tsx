"use client";
import { issueCertificateAction } from "@/app/actions/admin";
import { fmtDate } from "@/lib/data";
import type { Candidate } from "@/lib/services/certificates";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

/** Issue certificates: select volunteers, generate. A certificate is built from approved hours only and cannot be edited afterwards. */
export function CertificatesAdmin({ candidates }: { candidates: Candidate[] }) {
  const { can } = useAdmin();
  const { act, busy, note } = useAct();
  const ok = can("certificates.issue");
  const issue = (c: Candidate) => {
    const role = prompt(`Role or department to print for ${c.name} (optional):`, "");
    if (role === null) return;
    return act(issueCertificateAction(c.userId, role || undefined), (d) => (d.created ? `Certificate ${d.code} issued. It is now on ${c.name.split(" ")[0]}'s dashboard.` : `A certificate for these hours already exists: ${d.code}.`));
  };
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Certificates</h1><p className="mt-1 text-sm max-w-2xl">Volunteers with approved hours in your area. A certificate lists all approved hours so far, gets a unique verification code, and shows on the volunteer&apos;s dashboard. Pending hours never count.</p></div>
      {note}
      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[560px]">
          <thead><tr className="text-sm"><th className="py-2">Volunteer</th><th>Approved hours</th><th>Period</th><th>Certificate</th><th className="text-right">Action</th></tr></thead>
          <tbody>{candidates.map((c) => (
            <tr key={c.userId} className="border-t border-rule">
              <td className="py-3 font-bold">{c.name}</td><td>{c.approvedHours}</td><td className="text-sm">{fmtDate(c.periodStart)} to {fmtDate(c.periodEnd)}</td>
              <td>{c.certified ? <span className="stamp stamp-ok">Issued</span> : <span className="stamp stamp-wait">Not yet</span>}</td>
              <td className="text-right"><button className="btn btn-sm" disabled={busy || !ok || c.certified} onClick={() => issue(c)}>Issue certificate</button></td>
            </tr>))}</tbody>
        </table>
        {candidates.length === 0 && <p className="py-8 text-lg">Nobody in your area has approved hours yet.</p>}
      </div>
    </div>
  );
}
