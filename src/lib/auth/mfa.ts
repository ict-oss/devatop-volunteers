"use client";
import { supabaseBrowser } from "./supabase-browser";

/**
 * Two-factor for every admin (TOTP authenticator app). The database treats an admin as an admin ONLY at assurance
 * level aal2 (see is_aal2() in migration 0001), so an admin who skipped this step can do nothing in the admin area.
 * Enable "Multi-factor (TOTP)" in Supabase: Auth > Sign In / Providers.
 */

/** The admin's confirmed authenticator, if they have set one up before. */
export async function verifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabaseBrowser().auth.mfa.listFactors();
  if (error) throw new Error("We could not check your two-factor setup. Try again.");
  return data.totp[0]?.id ?? null; // `totp` holds verified factors only
}

export async function enrollTotp() {
  const mfa = supabaseBrowser().auth.mfa;
  // a half-finished earlier attempt would block a new one (same name), so clear it first
  const { data: all } = await mfa.listFactors();
  for (const f of all?.all ?? []) if (f.factor_type === "totp" && f.status === "unverified") await mfa.unenroll({ factorId: f.id });
  const { data, error } = await mfa.enroll({ factorType: "totp", friendlyName: "Devatop admin" });
  if (error) throw new Error("We could not start two-factor setup. Try again.");
  return { factorId: data.id, qrSvg: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotp(factorId: string, code: string) {
  const mfa = supabaseBrowser().auth.mfa;
  const { data: ch, error: e1 } = await mfa.challenge({ factorId });
  if (e1) throw new Error("We could not check that code. Try again.");
  const { error: e2 } = await mfa.verify({ factorId, challengeId: ch.id, code });
  if (e2) throw new Error("That code is not right. Open your authenticator app and type the newest 6 digits.");
}
