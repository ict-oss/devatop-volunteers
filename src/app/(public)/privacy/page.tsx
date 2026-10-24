export const metadata = { title: "Privacy & cookies" };

const S = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <section className="border-t border-ink py-6 grid md:grid-cols-12 gap-4"><h2 className="md:col-span-4 text-3xl">{t}</h2><div className="md:col-span-8 grid gap-3 max-w-2xl">{children}</div></section>
);

export default function Privacy() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-12 md:py-20">
      <h1 className="text-[length:var(--text-display)]" data-mask>Your data. <em className="accent">Your call.</em></h1>
      <p className="mt-6 text-[length:var(--text-lead)] max-w-2xl">Written to follow the Nigeria Data Protection Act 2023. Draft for legal review before launch.</p>
      <div className="mt-10">
        <S t="What we collect"><p>Name, phone, email, state and LGA, date of birth, skills, availability and (optionally) your NYSC state code. For under-18s, a parent or guardian&apos;s contact too.</p></S>
        <S t="Why, and who sees it"><p>Only to run the volunteer programme: review your application, schedule you, count your hours and issue certificates. Phone numbers and addresses are visible only to the admin roles that need them. A State Lead sees only their own state.</p></S>
        <S t="Consent, in writing"><p>Every consent you give is stored with the exact wording you agreed to and a timestamp. If you withdraw it, we stop emailing you and remove you from the public Roll within one minute.</p></S>
        <S t="Your rights"><p>You can download your data, correct it, withdraw consent or delete your account from your dashboard at any time.</p></S>
        <S t="Under 18"><p>We process a young person&apos;s data only after a parent or guardian confirms consent through their own email or phone, and after an age check.</p></S>
        <S t="Where data is stored"><p>Our hosting providers (Supabase and Vercel) store data outside Nigeria. Backups are kept away from the main server.</p></S>
        <S t="Cookies"><p>Essential cookies keep you signed in. Analytics cookies stay off unless you allow them in the banner. You can change your mind any time.</p></S>
      </div>
    </div>
  );
}
