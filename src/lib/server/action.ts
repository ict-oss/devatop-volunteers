import "server-only";
import { z } from "zod";
import { AppError } from "../services/db";

import type { Result } from "../result";
export type { Result };
export const ok = <T = undefined>(data?: T): Result<T> => ({ ok: true, data: data as T });
export const fail = (code: string, message: string, fields?: Record<string, string>): Result<never> => ({ ok: false, code, message, fields });

/** Wraps a server action: known rule violations become plain messages; anything unexpected becomes a generic one and is logged WITHOUT its message (rule 5). */
export async function run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try { return await fn(); }
  catch (e) {
    if (e instanceof AppError) return fail(e.code, e.message);
    if (e instanceof z.ZodError) return fail("invalid", "Please check the highlighted answers.", Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? "form"), i.message])));
    console.error("action failed:", e instanceof Error ? e.name : "unknown");
    return fail("error", "Something went wrong on our side. Please try again.");
  }
}
export const signedOut = () => fail("signed_out", "Your session has ended. Please verify your email again.");
