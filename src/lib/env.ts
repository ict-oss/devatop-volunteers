import { z } from "zod";

/**
 * Environment variables, validated once. Secrets never reach the browser: only NEXT_PUBLIC_* are public.
 * List every new variable in .env.example (CLAUDE.md "How to work").
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});
const serverSchema = z.object({
  /** Direct (non-pooled) connection string for migrations; pooled for the app. Owned by a Devatop account. */
  DATABASE_URL: z.string().min(10),
  /** Bypasses row-level security. Server only: cron jobs, sending email, deleting auth users. NEVER import into client code. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  EMAIL_FROM: z.string().email().default("volunteers@devatop.org"),
  BREVO_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

export const publicEnv = () => publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
export const serverEnv = () => serverSchema.parse(process.env);

/**
 * The site's own emails (approval, reminders, guardian link, messages to a group) are OFF until this is "true" and Brevo is set up.
 * Sign-in codes are not affected: Supabase sends those itself.
 */
export const emailEnabled = () => process.env.EMAIL_ENABLED === "true";

/** Sign-in protection (the proxy and the server guard on /admin) is off until this is "true". Turned on at cutover, once the pages read real data. */
export const authEnabled = () => process.env.AUTH_ENABLED === "true";
