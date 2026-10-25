import "server-only";
import { supabaseService } from "../auth/supabase-service";
import { IMAGE_BUCKET, PHOTO_MAX_BYTES, VIDEO_MAX_BYTES } from "../siteImages";

/**
 * Files for Admin > Site images live in one PUBLIC bucket (the public site shows them to everyone).
 * Nobody writes to it from the browser with their own login: the server checks the admin's permission first, then hands out a
 * one-time upload link for one exact file name. Deleting also happens here, after the database row has changed.
 */
let ready = false;
async function ensureBucket() {
  if (ready) return;
  const sb = supabaseService();
  const opts = { public: true, fileSizeLimit: VIDEO_MAX_BYTES, allowedMimeTypes: ["image/webp", "image/jpeg", "video/mp4", "video/webm"] };
  const made = await sb.storage.createBucket(IMAGE_BUCKET, opts);
  if (made.error && !/already exists|duplicate/i.test(made.error.message)) throw new Error("storage bucket unavailable");
  if (made.error) await sb.storage.updateBucket(IMAGE_BUCKET, opts); // keep the limits as the code says
  ready = true;
}

/** One-time upload permission for each exact path. */
export async function uploadTokens(paths: string[]): Promise<{ path: string; token: string }[]> {
  await ensureBucket();
  const sb = supabaseService();
  return Promise.all(paths.map(async (path) => {
    const { data, error } = await sb.storage.from(IMAGE_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error("could not prepare the upload");
    return { path, token: data.token };
  }));
}

/** Size in bytes of an uploaded file, or null if it is not there. The server measures; it never trusts the browser's number. */
export async function fileSize(path: string): Promise<number | null> {
  const i = path.lastIndexOf("/");
  const { data, error } = await supabaseService().storage.from(IMAGE_BUCKET).list(path.slice(0, i), { search: path.slice(i + 1), limit: 5 });
  if (error) return null;
  const f = data?.find((x) => x.name === path.slice(i + 1));
  const size = (f?.metadata as { size?: number } | undefined)?.size;
  return typeof size === "number" ? size : null;
}

export async function removeFiles(paths: string[]) {
  if (!paths.length) return;
  const { error } = await supabaseService().storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error("storage cleanup failed"); // the row is already updated; an orphan file is harmless
}
export { PHOTO_MAX_BYTES };
