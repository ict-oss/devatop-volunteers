"use client";
import { supabaseBrowser } from "./supabase-browser";

/**
 * Passwordless sign-in: a one-time code by email. No passwords are stored (acceptance criteria, Login and roles).
 * The same OTP step blocks fake sign-ups at the start of the application.
 * Email only: Devatop has no SMS provider, so there is no phone-code sign-in.
 * Error messages are fixed sentences: they never echo the email address (rule 5).
 */
export type Contact = { email: string };

export const CODE_LENGTH = 6;

export async function sendCode({ email }: Contact) {
  const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.status === 429 ? "Too many tries. Please wait a minute and ask for a new code." : "We could not send a code. Check the address and try again.");
}

export async function verifyCode({ email }: Contact, token: string) {
  const { data, error } = await supabaseBrowser().auth.verifyOtp({ email, token, type: "email" });
  if (error) throw new Error("That code is wrong or has expired. Check it, or ask for a new one.");
  return data.user;
}
