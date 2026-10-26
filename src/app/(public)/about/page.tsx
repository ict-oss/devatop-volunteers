import Link from "next/link";
import { Photo } from "@/components/Photo";
import { LoopVideo } from "@/components/LoopVideo";
import { asVisitor } from "@/lib/server/caller";
import { activeDepartments } from "@/lib/services/public";

export const metadata = { title: "About" };
export const dynamic = "force-dynamic";

export default async function About() {
  const departments = await asVisitor((tx) => activeDepartments(tx));
  return (
    <div>
      <section className="mx-auto max-w-[1500px] px-4 md:px-8 pt-12 md:pt-20">
        <h1 className="text-[length:var(--text-display)] max-w-5xl" data-mask>Youth-led. <em className="accent">Action-first.</em></h1>
        <div className="mt-10"><Photo slot="about-1" className="w-full" alt="Devatop team and volunteers together" /></div>
        <div className="mt-6"><LoopVideo slot="loop-ticker" label="Words that sum up Devatop scrolling past: show up, speak up, step up" className="w-full" /></div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 md:px-8 py-16 grid md:grid-cols-12 gap-10">
        <h2 className="md:col-span-4 text-[length:var(--text-title)]">Who we are</h2>
        <div className="md:col-span-7 grid gap-5 text-[length:var(--text-lead)]">
          <p>Devatop Centre for Africa Development is a youth-led organisation working against human trafficking, gender-based violence and other abuses across Nigeria.</p>
          <p>Our volunteers run AI4Rights sessions in schools, support reporting through Talkam, walk in awareness campaigns and tell the stories that make people act. <b>Volunteers are known by action, not by registration.</b></p>
        </div>
      </section>

      <section className="border-t border-ink">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-16 grid md:grid-cols-12 gap-10">
          <h2 className="md:col-span-4 text-[length:var(--text-title)]">How volunteering works</h2>
          <ol className="md:col-span-8">
            {["Apply in three short steps. Under 18? A parent or guardian confirms through their own email or by a link you pass on.", "Sign the code of conduct and safeguarding agreement. Nobody works with children or survivors before this.", "Finish orientation, join the WhatsApp group, and pick your first call to action.", "Check in with a QR scan, or log remote hours. An admin approves them.", "Only approved hours count. They build your record, your milestones and your certificate."].map((t, i) => (
              <li key={i} className="border-t border-rule py-4 flex gap-5"><span className="display text-5xl text-orange w-12 shrink-0">{i + 1}</span><span className="text-[length:var(--text-lead)]">{t}</span></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-ink">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-16 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4"><h2 className="text-[length:var(--text-title)]">Departments</h2><div className="mt-6"><Photo slot="about-2" className="w-full" alt="Training session" /></div></div>
          <ul className="md:col-span-8 grid sm:grid-cols-2 gap-x-8 content-start">
            {departments.map((d) => (
              <li key={d.id} className="border-t border-rule py-4"><div className="display text-3xl">{d.name}</div><p className="text-sm mt-1">{d.description}</p></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-orange border-y border-ink">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-14 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8">
            <h2 className="text-[length:var(--text-title)]">Safe by design</h2>
            <p className="mt-3 text-[length:var(--text-lead)] max-w-2xl">We never show survivors or identifiable children. Every volunteer photographed has a consent record. Every volunteer working with young people signs a safeguarding agreement first, and your data stays under the Nigeria Data Protection Act 2023.</p>
          </div>
          <div className="md:col-span-4"><Link href="/apply" className="btn btn-ink text-lg" data-cursor="Join">Become a volunteer</Link></div>
        </div>
      </section>
    </div>
  );
}
