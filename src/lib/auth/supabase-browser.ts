"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client. Uses only the public anon key: it can do nothing row-level security does not allow. */
export const supabaseBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
