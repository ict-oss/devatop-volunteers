"use client";
import { createContext, useContext } from "react";
import { can as canDo, inScope, type Action, type Admin } from "./permissions";

/** Set by the admin layout: the real signed-in admin (read on the server, two-factor already done). */
export const RealAdminContext = createContext<Admin | null>(null);

/** The signed-in admin. The server has already checked every permission (rule 1); `can` here only decides what to show.
 *  The audit log is written by the database itself (rule 4), so `log` is a no-op kept so older call sites keep compiling. */
export function useAdmin() {
  const admin = useContext(RealAdminContext);
  if (!admin) throw new Error("useAdmin must be used inside the admin area");
  return { admin, can: (a: Action) => canDo(admin, a), inScope: (r: Parameters<typeof inScope>[1]) => inScope(admin, r), log: (_action: string, _target: string) => undefined };
}
