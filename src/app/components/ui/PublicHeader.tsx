import Link from "next/link";
import HeaderAccountMenu from "./HeaderAccountMenu";
import PublicNav from "./PublicNav";

/**
 * The same header on every public page. Extracted from the landing page when a
 * second one appeared: a page without it reads as a different site, which is
 * exactly what a visitor should not wonder halfway through booking.
 */
function PublicHeader() {
  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="IcyPlay home">
          <img
            src="/assets/images/logo/IcyPlay%20Logo.png"
            alt="IcyPlay"
            className="h-20 w-auto object-contain"
          />
        </Link>

        <PublicNav />

        <div className="flex items-center gap-3">
          <Link
            href="/dashboards/project"
            className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Become a Partner
          </Link>
          <HeaderAccountMenu />
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
