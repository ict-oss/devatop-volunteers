import { redirect } from "next/navigation";
import { SiteImagesAdmin } from "@/components/admin/SiteImagesAdmin";
import { authEnabled, publicEnv } from "@/lib/env";
import { adminCaller, asCaller } from "@/lib/server/caller";
import { listSiteImages } from "@/lib/services/siteImages";
import { publicImageUrl } from "@/lib/siteImages";
import { SiteImagesProto } from "./SiteImagesProto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site images" };

export default async function Page() {
  if (!authEnabled()) return <SiteImagesProto />;
  const me = await adminCaller("settings.edit");
  if (!me) redirect("/admin/not-allowed");
  const base = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const rows = await asCaller(me.caller, (tx) => listSiteImages(tx));
  return <SiteImagesAdmin replaced={Object.fromEntries(rows.map((r) => [r.slotId, { kind: r.kind as "photo" | "video", url: publicImageUrl(base, r.path), poster: r.posterPath ? publicImageUrl(base, r.posterPath) : undefined, when: r.updatedAt.toISOString() }]))} />;
}
