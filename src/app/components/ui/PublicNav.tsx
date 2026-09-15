"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicNavHref, publicNavItems, publicSectionId } from "./publicSections";

/**
 * Where the reading line sits, as a fraction down the viewport.
 *
 * A third down, not the very top: a heading that has only just crept above the
 * fold is not yet what somebody is reading, and marking it then makes the menu
 * flicker a step ahead of the reader.
 */
const ReadingLine = 0.34;

/**
 * Which section of the landing page the reader is looking at.
 *
 * Read from the page rather than from the address bar. The hash says where
 * somebody last clicked, and goes stale the moment they scroll on — which on a
 * single long page is most of the time. It is also empty on arrival, so a
 * hash-driven menu would show nothing selected for the whole of the first
 * screen.
 *
 * The rule is the last section whose top has passed the reading line, which is
 * what a reader means by "where I am". Whichever section fills most of the
 * screen reads wrong the moment two differ in height: a short one fully in view
 * beats a tall one that is half in view but taking up more of the screen.
 *
 * On the landing page something is always marked, falling back to the first
 * section while the reader is still in the hero above it. Elsewhere none of
 * these sections exist and nothing is marked, which is right there.
 */
function useSectionInView() {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const here = publicNavItems
      .map(publicSectionId)
      .filter((id): id is string => id !== null && document.getElementById(id) !== null);

    if (here.length === 0) {
      return undefined;
    }

    function look() {
      const line = window.innerHeight * ReadingLine;
      let passed: string | null = null;

      for (const id of here) {
        const section = document.getElementById(id);

        if (section && section.getBoundingClientRect().top <= line) {
          passed = id;
        }
      }

      // Above the first section — in the hero — the reader has not passed
      // anything yet, and a menu with nothing marked on the page it belongs to
      // reads as a menu that does not work.
      setCurrent(passed ?? here[0]);
    }

    look();
    window.addEventListener("scroll", look, { passive: true });
    window.addEventListener("resize", look);

    return () => {
      window.removeEventListener("scroll", look);
      window.removeEventListener("resize", look);
    };
  }, []);

  return current;
}

function PublicNav() {
  const section = useSectionInView();
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-10 text-base font-semibold text-slate-700 lg:flex">
      {publicNavItems.map((item) => {
        const href = publicNavHref(item);
        const id = publicSectionId(item);
        // A page of its own is marked by the address; a section, by where the
        // reader has scrolled to. Both are "where you are", asked of whichever
        // one knows.
        const here = id === null ? pathname === href : section === id;

        return (
          <Link
            key={item}
            href={href}
            aria-current={here ? "true" : undefined}
            className={`relative py-1 transition hover:text-[#2563EB] ${
              here ? "text-[#2563EB]" : ""
            }`}
          >
            {item}
            {/* Under the word rather than a change of colour alone: colour is
                the one signal a reader may not have. */}
            <span
              aria-hidden
              className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#2563EB] transition-opacity ${
                here ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export default PublicNav;
