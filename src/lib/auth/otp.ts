"use client";
import { supabaseBrowser } from "./supabase-browser";

/**
 * Passwordless sign-in: a one-time code by email or SMS. No passwords are stored (acceptance criteria, Login and roles).
 * The same OTP step blocks fake sign-ups at the start of the application.
 * SMS needs a phone provider enabled in Supabase (Auth > Providers > Phone); email works out of the box.
 */
export type Contact = { email: string } | { phone: string };

export async function sendCode(c: Contact) {
  const { error } = await supabaseBrowser().auth.signInWithOtp("email" in c ? { email: c.email, options: { shouldCreateUser: true } } : { phone: c.phone, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifyCode(c: Contact, token: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await ("email" in c ? supabase.auth.verifyOtp({ email: c.email, token, type: "email" }) : supabase.auth.verifyOtp({ phone: c.phone, token, type: "sms" }));
  if (error) throw new Error(error.message);
  return data.user;
}
