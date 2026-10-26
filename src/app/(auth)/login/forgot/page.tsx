import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-[length:var(--text-display)]">Forgot your <em className="accent">password?</em></h1>
      <p className="mt-4">Enter your email and we will send you a link to choose a new one.</p>
      <div className="mt-8"><ForgotForm /></div>
    </>
  );
}
