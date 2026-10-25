import { SLOTS, VIDEOS } from "./images";
export type { ReplacedImage } from "./images";

export const IMAGE_BUCKET = "site-images";
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // the browser shrinks every picture to about 100-300 KB; this is the ceiling
export const VIDEO_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 15;

export type SiteImageKind = "photo" | "video";

export const slotKind = (slotId: string): SiteImageKind | null => (SLOTS[slotId] ? "photo" : VIDEOS[slotId] ? "video" : null);
export const publicImageUrl = (supabaseUrl: string, path: string) => `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;

/** The only file names a slot may have. The browser is told the name; when saving, the server checks it again. */
export const pathPattern = (slotId: string, ext: string) => new RegExp(`^${slotKind(slotId) === "video" ? "videos" : "photos"}/${slotId}-\\d{10,14}\\.${ext}$`);
