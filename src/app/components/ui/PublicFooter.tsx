import Link from "next/link";
import { publicNavHref } from "./publicSections";

/**
 * Only links that go somewhere. A footer full of plausible headings that lead
 * nowhere costs more trust than the tidy grid buys, so this carries what the
 * site actually has and nothing else.
 */
const columns = [
  {
    title: "Explore",
    links: [
      { label: "Courts", href: publicNavHref("Courts") },
      { label: "How it works", href: publicNavHref("How It Works") },
    ],
  },
  {
    title: "For venues",
    links: [{ label: "Become a partner", href: "/dashboards/project" }],
  },
  {
    title: "Your account",
    links: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Create an account", href: "/sign-in" },
      { label: "Help centre", href: publicNavHref("Help Center") },
    ],
  },
];

function PublicFooter() {
  return (
    <footer className="mt-20 bg-[#071955] text-white">
      {/* The one thing this footer is for. A venue reading this far is the
          reader most worth asking. */}
      <section className="mx-auto max-w-7xl px-6 py-14 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight">Own a court? Put it on IcyPlay.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-blue-100">
          List your venue, set your own rates, and take bookings for games and events.
          We handle discovery, availability and confirmations.
        </p>
        <Link
          href="/dashboards/project"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-600"
        >
          Become a Partner
        </Link>
      </section>

      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
          <div>
            <img
              src="/assets/images/logo/IcyPlay%20Logo%20Transparent.png"
              alt="IcyPlay"
              className="h-14 w-auto object-contain brightness-0 invert"
            />
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
              Book a court for your game, or hire the whole floor for a party, a
              tournament or a corporate day.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-blue-100 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-blue-200 lg:px-8">
          <p>&copy; {new Date().getFullYear()} IcyPlay. All rights reserved.</p>
          <p>
            Powered by{" "}
            <a
              href="https://www.services-icypay.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-white underline-offset-4 transition hover:underline"
            >
              IcyPay Web Development Services
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
