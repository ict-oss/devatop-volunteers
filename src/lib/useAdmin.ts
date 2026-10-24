"use client";
import { useCallback } from "react";
import { DEMO_ADMINS, can as canDo, inScope, type Action, type Admin } from "./permissions";
import { KEYS, SEED_AUDIT, newId, nowIso, useLocal, type AuditRow } from "./store";

/** Prototype: the role switcher stands in for real login. Production reads the admin from the Supabase session on the server. */
export function useAdmin() {
  const [idx, setIdx] = useLocal<number>(KEYS.role, 0);
  const [audit, setAudit] = useLocal<AuditRow[]>(KEYS.audit, SEED_AUDIT);
  const admin: Admin = DEMO_ADMINS[idx] ?? DEMO_ADMINS[0];
  const log = useCallback((action: string, target: string) => setAudit((p) => [{ id: newId(), at: nowIso(), who: admin.name, action, target }, ...p]), [admin.name, setAudit]);
  return { admin, idx, setIdx, can: (a: Action) => canDo(admin, a), inScope: (r: Parameters<typeof inScope>[1]) => inScope(admin, r), log, audit };
}
