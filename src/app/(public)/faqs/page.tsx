import Link from "next/link";
import { faqs } from "@/lib/data";
import { asVisitor } from "@/lib/server/caller";
import { publicSettings } from "@/lib/services/public";

export const metadata = { title: "FAQs" };
export const dynamic = "force-dynamic";

export default async function Faqs() {
  const settings = await asVisitor((tx) => publicSettings(tx));
  return (
    <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-12 md:py-20 grid md:grid-cols-12 gap-10">
      <div className="md:col-span-5">
        <h1 className="text-[length:var(--text-display)]" data-mask>Fair <em className="accent">questions.</em></h1>
        <p className="mt-6 text-[length:var(--text-lead)]">Plain answers. If yours is not here, ask us.</p>
        <Link href="/contact" className="btn mt-6" data-cursor="Ask">Ask a question</Link>
      </div>
      <div className="md:col-span-7">
        {faqs(settings.minAge, settings.reviewDays).map(([q, a]) => (
          <details key={q} className="border-t border-ink group py-1" data-native>
            <summary className="list-none cursor-pointer py-4 flex justify-between gap-6 items-start min-h-14">
              <span className="display text-3xl md:text-4xl leading-[0.95]">{q}</span>
              <span className="display text-4xl text-orange group-open:rotate-45 transition-transform shrink-0" aria-hidden="true">+</span>
            </summary>
            <p className="pb-5 max-w-xl text-[length:var(--text-lead)]">{a}</p>
          </details>
        ))}
        <div className="border-t border-ink" />
        <div className="mt-10"><Link href="/apply" className="btn" data-magnetic data-cursor="Join">Become a volunteer</Link></div>
      </div>
    </div>
  );
}
