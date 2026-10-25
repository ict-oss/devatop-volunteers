"use client";
import { supabaseBrowser } from "./supabase-browser";

/**
 * Passwordless sign-in: a one-time code by email or SMS. No passwords are stored (acceptance criteria, Login and roles).
 * The same OTP step blocks fake sign-ups at the start of the application.
 * SMS needs a phone provider enabled in Supabase (Auth > Providers > Phone); email works out of the box.
 * Error messages are fixed sentences: they never echo the email or phone number (rule 5).
 */
export type Contact = { email: string } | { phone: string };

export const CODE_LENGTH = 6;

export async function sendCode(c: Contact) {
  const { error } = await supabaseBrowser().auth.signInWithOtp("email" in c ? { email: c.email, options: { shouldCreateUser: true } } : { phone: c.phone, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.status === 429 ? "Too many tries. Please wait a minute and ask for a new code." : "We could not send a code. Check the address and try again.");
}

export async function verifyCode(c: Contact, token: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await ("email" in c ? supabase.auth.verifyOtp({ email: c.email, token, type: "email" }) : supabase.auth.verifyOtp({ phone: c.phone, token, type: "sms" }));
  if (error) throw new Error("That code is wrong or has expired. Check it, or ask for a new one.");
  return data.user;
}
