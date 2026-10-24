import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "../env";

/**
 * SERVICE ROLE client: bypasses row-level security. Server only, and only for jobs that genuinely have no user:
 * deleting an auth user after delete_my_account(), cron reminders, bootstrapping the first Super Admins.
 * Every use should be one the reviewer can point to; if a person is acting, use createClient() instead.
 */
export const supabaseService = () =>
  createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
