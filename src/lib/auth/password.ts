"use client";
import { supabaseBrowser } from "./supabase-browser";
import { checkPassword } from "./password-rules";

/**
 * Sign in with an email address and a password. (The word "username" on screen means the email: it is what Supabase keys accounts on.)
 * Error messages are fixed sentences: they never echo the email address or the password (rule 5).
 */
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.status === 429 ? "Too many tries. Please wait a minute and try again." : "Wrong email or password.");
}

/** Makes the account. "signed_in" when Supabase starts a session straight away; "check_email" if the project still requires email confirmation. */
export async function createAccount(email: string, password: string): Promise<"signed_in" | "check_email"> {
  const bad = checkPassword(password, email);
  if (bad) throw new Error(bad);
  const { data, error } = await supabaseBrowser().auth.signUp({ email, password });
  if (error) {
    if (error.status === 429) throw new Error("Too many tries. Please wait a minute and try again.");
    if (/registered|already|exists/i.test(error.message)) throw new Error("An account with this email already exists. Sign in instead, or use “Forgot password”.");
    throw new Error("We could not create the account. Check the email and try again.");
  }
  return data.session ? "signed_in" : "check_email";
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset` });
  if (error && error.status === 429) throw new Error("Too many tries. Please wait a minute and try again.");
  // any other outcome looks the same, so nobody can find out which emails have accounts
}

export async function setNewPassword(password: string, email = "") {
  const bad = checkPassword(password, email);
  if (bad) throw new Error(bad);
  const { error } = await supabaseBrowser().auth.updateUser({ password });
  if (error) throw new Error("We could not save the new password. Ask for a new reset link and try again.");
}
