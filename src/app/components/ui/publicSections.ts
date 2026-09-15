/**
 * The public menu, in the order it appears.
 *
 * Its own module, with no "use client" on it, because both the header — which
 * watches the page scroll and so is a client component — and the footer, which
 * is rendered on the server, need these. A constant shared between the two
 * cannot live in either.
 */
export const publicNavItems = ["Courts and Events", "How It Works", "Help Center"];

/**
 * The items that are pages of their own rather than places on the landing page.
 *
 * Anything not listed here is an anchor, so a section that outgrows the landing
 * page becomes a page by adding one line — and the menu, the footer and the
 * highlighting all follow from it.
 */
const pages: Record<string, string> = {
  "How It Works": "/how-it-works",
  "Help Center": "/help-center",
};

/**
 * Items whose place on the page is not spelled the way they are labelled.
 *
 * A label can be rewritten; an anchor is an address. "Courts and Events"
 * grew its name when events were added, but a dozen "back to courts" links
 * across the site — the checkout, the court page, the booking policy — point
 * at #courts, and renaming it would break every one of them in silence.
 */
const anchors: Record<string, string> = {
  "Courts and Events": "courts",
};

const anchor = (item: string) => anchors[item] ?? item.toLowerCase().replace(/\s+/g, "-");

/**
 * Where an item goes. An anchor is rooted at "/" rather than bare: from the
 * account page a plain "#courts" would scroll nowhere.
 */
export const publicNavHref = (item: string) => pages[item] ?? `/#${anchor(item)}`;

/**
 * The id on the landing page this item points at, or null when it is a page of
 * its own and there is nothing to scroll to.
 */
export const publicSectionId = (item: string) =>
  item in pages ? null : anchor(item);
