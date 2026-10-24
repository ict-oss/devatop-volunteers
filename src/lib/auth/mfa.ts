"use client";
import { supabaseBrowser } from "./supabase-browser";

/**
 * Two-factor for every admin (TOTP authenticator app). The database treats an admin as an admin ONLY at assurance
 * level aal2 (see is_aal2() in migration 0001), so an admin who skipped this step can do nothing in the admin area.
 * Enable "Multi-factor (TOTP)" in Supabase: Auth > Sign In / Providers.
 */
export async function enrollTotp() {
  const { data, error } = await supabaseBrowser().auth.mfa.enroll({ factorType: "totp", friendlyName: "Devatop admin" });
  if (error) throw new Error(error.message);
  return { factorId: data.id, qrSvg: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotp(factorId: string, code: string) {
  const mfa = supabaseBrowser().auth.mfa;
  const { data: ch, error: e1 } = await mfa.challenge({ factorId });
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await mfa.verify({ factorId, challengeId: ch.id, code });
  if (e2) throw new Error(e2.message);
}
