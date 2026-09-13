import Link from "next/link";

/**
 * The marketing sections, in the order they appear on the landing page. Kept
 * here rather than in the page so the header can carry the same menu wherever
 * a signed-in customer happens to be.
 */
export const publicNavItems = ["Courts", "How It Works", "Help Center"];

/**
 * Every item is an anchor on the landing page, so the link is rooted at "/".
 * From the account page a bare "#courts" would scroll nowhere.
 */
export const publicNavHref = (item: string) =>
  `/#${item.toLowerCase().replace(/\s+/g, "-")}`;

function PublicNav() {
  return (
    <nav className="hidden items-center gap-10 text-base font-semibold text-slate-700 lg:flex">
      {publicNavItems.map((item) => (
        <Link
          key={item}
          href={publicNavHref(item)}
          className="transition hover:text-[#2563EB]"
        >
          {item}
        </Link>
      ))}
    </nav>
  );
}

export default PublicNav;
