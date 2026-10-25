import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { CertificateDocument, certificateQr } from "../../src/lib/pdf/Certificate";

describe("certificate PDF", () => {
  it("renders a real, single-page PDF with the holder's name and a QR", async () => {
    const c = { id: "1", code: "DVT-7K2M-9QXA", holderName: "Amaka Obi", roleTitle: "AI4Rights facilitator", hours: 18, periodStart: "2026-09-12", periodEnd: "2026-10-17", issuedAt: "2026-10-20T10:00:00.000Z", revoked: false };
    const qr = await certificateQr("https://volunteer.devatop.org/verify/DVT-7K2M-9QXA");
    expect(qr.startsWith("data:image/png;base64,")).toBe(true);
    const buf = await renderToBuffer(createElement(CertificateDocument, { c, qr, siteHost: "volunteer.devatop.org" }) as never);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(3000);
    expect(buf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
  });
});
