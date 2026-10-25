import { timingSafeEqual } from "node:crypto";
import { sendReminders } from "@/lib/services/reminders";
import { trusted } from "@/lib/server/caller";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Daily job (see vercel.json). Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; nobody else may run it. Returns counts only. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || secret.length < 16 || !same(given, secret)) return new Response("Unauthorized", { status: 401 });
  const result = await sendReminders(trusted(), publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""));
  return Response.json(result);
}
