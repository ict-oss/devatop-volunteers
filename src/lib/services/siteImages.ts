import { eq } from "drizzle-orm";
import { z } from "zod";
import { siteImages } from "../db/schema";
import { pathPattern, slotKind, VIDEO_MAX_BYTES, PHOTO_MAX_BYTES } from "../siteImages";
import { AppError, type Db } from "./db";

export type SiteImageRow = typeof siteImages.$inferSelect;

export const saveSchema = z.object({
  slotId: z.string().max(60),
  path: z.string().max(200),
  posterPath: z.string().max(200).optional(),
  consent: z.literal(true, { error: "Please tick that everyone shown has agreed." }),
}).superRefine((v, ctx) => {
  const kind = slotKind(v.slotId);
  if (!kind) return ctx.addIssue({ code: "custom", message: "That picture place does not exist.", path: ["slotId"] });
  if (kind === "photo") {
    if (!pathPattern(v.slotId, "webp").test(v.path)) ctx.addIssue({ code: "custom", message: "That file name is not allowed.", path: ["path"] });
    if (v.posterPath) ctx.addIssue({ code: "custom", message: "A picture has no still frame.", path: ["posterPath"] });
  } else {
    if (!pathPattern(v.slotId, "(mp4|webm)").test(v.path)) ctx.addIssue({ code: "custom", message: "That file name is not allowed.", path: ["path"] });
    if (!v.posterPath || !pathPattern(v.slotId, "jpg").test(v.posterPath)) ctx.addIssue({ code: "custom", message: "The clip needs its still frame.", path: ["posterPath"] });
  }
});
export type SaveInput = z.infer<typeof saveSchema>;

/** Every replaced slot. Readable by anyone (the public site shows them). */
export const listSiteImages = (tx: Db) => tx.select().from(siteImages);

/** Replace (or add) a slot's file. Returns the files it replaced so the caller can delete them from storage. `bytes` is measured by the server, never taken from the browser. */
export async function saveSiteImage(tx: Db, userId: string, input: SaveInput, bytes: number): Promise<string[]> {
  const kind = slotKind(input.slotId)!;
  if (bytes > (kind === "video" ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES)) throw new AppError("too_big", "That file is too big. Pick a smaller one.");
  const [old] = await tx.select().from(siteImages).where(eq(siteImages.slotId, input.slotId));
  const now = new Date();
  const row = { kind, path: input.path, posterPath: input.posterPath ?? null, bytes, consentBy: userId, consentAt: now, updatedAt: now };
  await tx.insert(siteImages).values({ slotId: input.slotId, ...row }).onConflictDoUpdate({ target: siteImages.slotId, set: row });
  return old ? [old.path, old.posterPath].filter((p): p is string => !!p) : [];
}

/** Put the original back. Returns the files to delete from storage. */
export async function removeSiteImage(tx: Db, slotId: string): Promise<string[]> {
  const gone = await tx.delete(siteImages).where(eq(siteImages.slotId, slotId)).returning();
  return gone.flatMap((g) => [g.path, g.posterPath].filter((p): p is string => !!p));
}
