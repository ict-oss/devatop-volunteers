import type { AuditRow } from "@/lib/services/overview";

export function AuditAdmin({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Audit log</h1><p className="mt-1 text-sm">Who approved, edited or deleted what, and when. The database writes a row for every admin change; it can never be edited. Shows record ids only, never personal details.</p></div>
      <div className="overflow-x-auto border-t-2 border-ink">
        <table className="w-full text-left min-w-[560px]"><thead><tr className="text-sm"><th className="py-2">When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-rule"><td className="py-2 text-sm whitespace-nowrap">{new Date(r.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}</td><td className="font-bold">{r.who}</td><td>{r.action}</td><td className="text-sm">{r.record}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="py-8">Nothing yet.</p>}
      </div>
    </div>
  );
}
