import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import QRCode from "qrcode";
import type { CertificateView } from "../services/certificates";
import { DEVATOP_MARK } from "./brandMark";

// Brand colours (CLAUDE.md design rules). Built-in PDF fonts keep the file small; the web fonts are not embedded.
const INK = "#16130F", PAPER = "#F2EDE3", ORANGE = "#F05023";
const s = StyleSheet.create({
  page: { backgroundColor: PAPER, padding: 36, fontFamily: "Helvetica", color: INK },
  frame: { border: `3pt solid ${INK}`, flexGrow: 1, padding: 28, justifyContent: "space-between" },
  bar: { backgroundColor: ORANGE, height: 14, marginBottom: 18 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3pt solid ${INK}`, paddingBottom: 8 },
  title: { fontSize: 30, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  edition: { fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  certifies: { fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginTop: 22, letterSpacing: 2 },
  name: { fontSize: 54, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginTop: 4 },
  body: { fontSize: 15, marginTop: 14, lineHeight: 1.4 },
  strong: { fontFamily: "Helvetica-Bold" },
  quote: { fontSize: 15, fontFamily: "Helvetica-Oblique", color: "#B83A12" },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1pt solid ${INK}`, paddingTop: 10 },
  small: { fontSize: 9, lineHeight: 1.5, maxWidth: 420 },
  code: { fontFamily: "Courier-Bold", fontSize: 12, backgroundColor: INK, color: PAPER, padding: "2 6" },
});
const long = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function certificateQr(verifyUrl: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl, { margin: 0, width: 240, color: { dark: INK, light: PAPER } });
}

/** One page, A4 landscape: name, role, approved hours, dates, and a unique code with a QR that opens the public check. */
export function CertificateDocument({ c, qr, siteHost }: { c: CertificateView; qr: string; siteHost: string }) {
  return (
    <Document title={`Devatop volunteer certificate ${c.code}`} author="Devatop Centre for Africa Development">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View>
            <View style={s.bar} />
            <View style={s.head}>
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <Image src={DEVATOP_MARK} style={{ width: 46, marginRight: 12 }} />
                <Text style={s.title}>The Devatop Record</Text>
              </View>
              <Text style={s.edition}>Volunteer edition{"\n"}Devatop Centre for Africa Development</Text>
            </View>
            <Text style={s.certifies}>This certifies that</Text>
            <Text style={s.name}>{c.holderName}</Text>
            <Text style={s.body}>
              volunteered <Text style={s.strong}>{c.hours} approved hours</Text>
              {c.roleTitle ? <> as <Text style={s.strong}>{c.roleTitle}</Text></> : null}, {long(c.periodStart)} to {long(c.periodEnd)}, because{" "}
              <Text style={s.quote}>volunteers are known by action.</Text>
            </Text>
          </View>
          <View style={s.foot}>
            <View style={s.small}>
              <Text>Verification code: <Text style={s.code}> {c.code} </Text></Text>
              <Text style={{ marginTop: 6 }}>Issued {long(c.issuedAt.slice(0, 10))}. Scan the code or visit {siteHost}/verify/{c.code}. That page confirms this certificate is genuine and shows nothing else about the volunteer.</Text>
            </View>
            <Image src={qr} style={{ width: 84, height: 84 }} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
