"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** A third down the screen: what somebody is reading, not what has just appeared. */
const ReadingLine = 0.34;

/*
 * The deck is 1024px wide and centred, so a rail needs a gutter to stand in.
 * Below 1180px the gutter is too thin for one and the bar goes back on top.
 * The breakpoint is written out at both call sites rather than held in a
 * constant: Tailwind generates classes by reading the source, and a class
 * assembled at runtime is one it never sees.
 */

export type NavSection = { id: string; eyebrow: string; title: string };

/** Which section the reading line is sitting in. */
function useCurrentSection(sections: NavSection[]) {
  const [current, setCurrent] = useState(sections[0]?.id ?? null);

  useEffect(() => {
    function look() {
      const line = window.innerHeight * ReadingLine;
      let passed: string | null = null;

      for (const section of sections) {
        const element = document.getElementById(section.id);

        if (element && element.getBoundingClientRect().top <= line) {
          passed = section.id;
        }
      }

      setCurrent(passed ?? sections[0]?.id ?? null);
    }

    look();
    window.addEventListener("scroll", look, { passive: true });
    window.addEventListener("resize", look);

    return () => {
      window.removeEventListener("scroll", look);
      window.removeEventListener("resize", look);
    };
  }, [sections]);

  return current;
}

/**
 * The section navigation.
 *
 * A presenter is not scrolling to find a section — they are being asked about
 * one, and need to be there in a click while a client is watching. So it is
 * always on screen, in one of two shapes.
 *
 * On a wide screen it floats in the left gutter, which is empty space the deck
 * was wasting, and the reader keeps the full height of the window for the
 * content. On anything narrower there is no gutter to float in, so it goes back
 * to a bar pinned along the top.
 */
function DemoNav({ sections }: { sections: NavSection[] }) {
  const current = useCurrentSection(sections);

  return (
    <>
      {/* ------------------------------------------- the floating left rail */}
      <nav
        aria-label="Walkthrough sections"
        className="fixed top-1/2 left-4 z-40 hidden -translate-y-1/2 min-[1180px]:block 2xl:left-8"
      >
        <ol className="flex flex-col gap-1 rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-xl shadow-[#071955]/10 backdrop-blur">
          {sections.map((section) => {
            const here = current === section.id;

            return (
              <li key={section.id} className="relative">
                <Link
                  href={`/demo#${section.id}`}
                  aria-current={here ? "true" : undefined}
                  className="group flex items-center gap-2.5 outline-none"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black transition ${
                      here
                        ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/25"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-[#071955] group-focus-visible:ring-2 group-focus-visible:ring-[#2563EB]"
                    }`}
                  >
                    {section.eyebrow}
                  </span>

                  {/* Seven titles spelled out need a gutter only a big monitor
                      has, so below 2xl they are held back until asked for —
                      the section's own heading already says where you are. */}
                  <span
                    className={`pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 rounded-full bg-[#071955] px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-white opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-visible:opacity-100 2xl:static 2xl:ml-0 2xl:w-40 2xl:translate-y-0 2xl:bg-transparent 2xl:px-0 2xl:py-0 2xl:pr-2 2xl:leading-5 2xl:whitespace-normal 2xl:opacity-100 2xl:shadow-none ${
                      here ? "2xl:text-[#071955]" : "2xl:text-slate-500"
                    }`}
                  >
                    {section.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* --------------------------------------------- the narrow-screen bar */}
      <nav
        aria-label="Walkthrough sections"
        className="sticky top-0 z-40 border-b border-slate-200 bg-[#f5f9ff]/95 backdrop-blur min-[1180px]:hidden"
      >
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          {/* One row that scrolls sideways rather than wrapping: seven sections
              wrap to four lines on a laptop, and a bar that tall is not a bar. */}
          <div className="flex gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((section) => {
              const here = current === section.id;

              return (
                <Link
                  key={section.id}
                  href={`/demo#${section.id}`}
                  aria-current={here ? "true" : undefined}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
                    here
                      ? "bg-[#2563EB] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#071955]"
                  }`}
                >
                  <span className={here ? "text-blue-200" : "text-slate-400"}>
                    {section.eyebrow}
                  </span>{" "}
                  {section.title}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

/**
 * The step at the foot of a section.
 *
 * A presenter reaching the end of a point should move on without scrolling
 * back to the bar, and somebody reading it alone should know there is a next.
 */
export function DemoStep({ previous, next }: { previous?: NavSection; next?: NavSection }) {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
      {previous ? (
        <Link
          href={`/demo#${previous.id}`}
          className="text-sm font-bold text-slate-500 transition hover:text-[#071955]"
        >
          &larr; {previous.eyebrow} · {previous.title}
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={`/demo#${next.id}`}
          className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          {next.eyebrow} · {next.title} &rarr;
        </Link>
      ) : (
        <Link
          href="/demo"
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300"
        >
          Back to the top
        </Link>
      )}
    </div>
  );
}

export default DemoNav;
