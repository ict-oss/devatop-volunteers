import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { CertificateDocument, certificateQr } from "@/lib/pdf/Certificate";
import { certificateByCode } from "@/lib/services/certificates";
import { asCaller, getCaller } from "@/lib/server/caller";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The certificate as a PDF. Only the owner, or an admin who may issue certificates, can open it (row-level security decides). */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z0-9-]{6,24}$/i.test(code)) return new Response("Not found", { status: 404 });
  const me = await getCaller();
  if (!me) return new Response("Sign in first", { status: 401 });
  const cert = await asCaller(me, (tx) => certificateByCode(tx, code));
  if (!cert) return new Response("Not found", { status: 404 }); // also what a stranger gets: no hint that the code exists
  const site = publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const qr = await certificateQr(`${site}/verify/${cert.code}`);
  const pdf = await renderToBuffer(createElement(CertificateDocument, { c: cert, qr, siteHost: site.replace(/^https?:\/\//, "") }) as never);
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="devatop-certificate-${cert.code}.pdf"`, "cache-control": "private, no-store" },
  });
}
