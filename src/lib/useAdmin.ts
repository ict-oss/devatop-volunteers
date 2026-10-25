"use client";
import { createContext, useCallback, useContext } from "react";
import { DEMO_ADMINS, can as canDo, inScope, type Action, type Admin } from "./permissions";
import { KEYS, SEED_AUDIT, newId, nowIso, useLocal, type AuditRow } from "./store";

/** Set by the admin layout once AUTH_ENABLED: the real signed-in admin. Pages then use it instead of the prototype switcher. */
export const RealAdminContext = createContext<Admin | null>(null);

/** Prototype: the role switcher stands in for real login. Production reads the admin from the Supabase session on the server. */
export function useAdmin() {
  const [idx, setIdx] = useLocal<number>(KEYS.role, 0);
  const [audit, setAudit] = useLocal<AuditRow[]>(KEYS.audit, SEED_AUDIT);
  const real = useContext(RealAdminContext);
  const admin: Admin = real ?? DEMO_ADMINS[idx] ?? DEMO_ADMINS[0];
  // real mode: the database writes the audit log itself (rule 4), so the browser-side log does nothing
  const log = useCallback((action: string, target: string) => real ? undefined : setAudit((p) => [{ id: newId(), at: nowIso(), who: admin.name, action, target }, ...p]), [admin.name, setAudit, real]);
  return { admin, idx, setIdx, can: (a: Action) => canDo(admin, a), inScope: (r: Parameters<typeof inScope>[1]) => inScope(admin, r), log, audit };
}
