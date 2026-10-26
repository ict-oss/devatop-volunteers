import { ResetForm } from "./ResetForm";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">New <em className="accent">password.</em></h1>
      <div className="mt-8"><ResetForm /></div>
    </>
  );
}
