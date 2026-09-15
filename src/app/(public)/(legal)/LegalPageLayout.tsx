import type { ReactNode } from "react";
import Link from "next/link";

type Section = { title: string; content: ReactNode };

/**
 * The id a section is reachable at.
 *
 * Derived from the title rather than written beside it: a policy that numbers
 * its own sections will renumber them the day one is added, and a link to
 * "section 6" then points at whatever moved into sixth place.
 */
export const anchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function LegalPageLayout({
  title,
  summary,
  sections,
  backHref = "/sign-up",
  backLabel = "Back to registration",
}: {
  title: string;
  summary: string;
  sections: Section[];
  /** Where the reader came from. Registration, unless the page says otherwise. */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f5f9ff] px-5 py-8 text-slate-700 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-6">
          <Link href="/" aria-label="IcyPlay home">
            <img
              src="/assets/images/logo/IcyPlay%20Logo%20Transparent.png"
              alt="IcyPlay"
              className="h-14 w-auto"
            />
          </Link>
          <Link
            href={backHref}
            className="text-sm font-bold text-[#1264F7] hover:text-[#071955]"
          >
            {backLabel}
          </Link>
        </header>

        <article className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-10 lg:px-14 lg:py-12">
          <p className="text-sm font-bold tracking-[0.16em] text-[#1264F7] uppercase">
            IcyPlay Legal
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#071955] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Effective date: August 15, 2026
          </p>
          <p className="mt-6 text-base leading-7">{summary}</p>

          <div className="mt-10 space-y-9">
            {sections.map((section, index) => (
              <section key={section.title} id={anchor(section.title)}>
                <h2 className="text-xl font-bold text-[#071955]">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 leading-7 [&_li]:ml-5 [&_li]:list-disc">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-slate-600">
            These policies are an operational draft tailored to the current
            IcyPlay platform. The platform operator should have Philippine
            counsel review them and insert the registered business name,
            business address, and official privacy/support contact details
            before production launch.
          </div>
        </article>
      </div>
    </main>
  );
}

export default LegalPageLayout;
