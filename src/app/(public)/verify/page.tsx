import { VerifyForm } from "./VerifyForm";

export const metadata = { title: "Verify a certificate" };

export default function VerifyIndex() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-16 md:py-24 min-h-[60vh]">
      <h1 className="text-[length:var(--text-display)]">Check a <em className="accent">certificate.</em></h1>
      <p className="mt-6 text-[length:var(--text-lead)] max-w-xl">Type the code printed on the certificate, or scan its QR code. We confirm whether it is genuine and show only the name, hours and dates.</p>
      <VerifyForm />
    </div>
  );
}
