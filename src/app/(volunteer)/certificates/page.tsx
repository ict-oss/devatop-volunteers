"use client";
import { CertificatesProto } from "./CertificatesProto";
import { CertificatesReal } from "./CertificatesReal";
import { useLive } from "@/lib/live";

export default function Certificates() {
  return useLive() ? <CertificatesReal /> : <CertificatesProto />;
}
