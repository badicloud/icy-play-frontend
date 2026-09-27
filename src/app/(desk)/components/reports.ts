/**
 * The reports the desk has, and the ones it is going to have.
 *
 * One list, read by both the side menu and the landing page. Two copies would
 * disagree the first time a report shipped — the menu would offer it and the
 * landing page would still call it coming, or the other way round.
 *
 * The unbuilt ones are named rather than hidden, the same way the desk
 * overview names them: somebody who cannot find takings should be able to see
 * that they are coming rather than wonder whether they are looking in the
 * wrong place.
 */
export type DeskReport = {
  id: string;
  title: string;
  blurb: string;
  /** Absent means not built. The menu greys it; the landing page leaves it out. */
  href?: string;
  /**
   * The same report in the admin console, across every venue or narrowed to
   * one facility owner. Absent until that version is built; the admin menu
   * greys it the same way.
   */
  adminHref?: string;
  /** True where an attendant would see a page with nothing on it. */
  ownerOnly?: boolean;
  /**
   * Where the numbers would come from, when they are the same numbers a built
   * report already works out.
   *
   * Written down because three of the planned reports are the utilization
   * report's own figures read a different way round — over time rather than
   * per court, or sorted rather than listed. Building a second sum for them
   * would give the venue two answers to one question, which is the thing this
   * report was careful to avoid in the first place.
   */
  sameSumsAs?: string;
};

export type DeskReportGroup = {
  id: string;
  title: string;
  reports: DeskReport[];
};

export const deskReportGroups: DeskReportGroup[] = [
  {
    id: "courts",
    title: "Courts and bookings",
    reports: [
      {
        id: "utilization",
        title: "Court utilisation",
        blurb:
          "How much of what you had open actually got used, court by court — and the hours lost to maintenance rather than to nobody booking.",
        href: "/desk/reports/utilization",
        adminHref: "/admin/reports/utilization",
      },
      {
        id: "hours",
        title: "Sold Hours",
        blurb:
          "How many hours you sold each day, week or month, drawn as a line — and the days a court was under maintenance.",
        sameSumsAs: "utilization",
        href: "/desk/reports/hours",
        adminHref: "/admin/reports/hours",
      },
      {
        id: "sold",
        title: "Sold Courts",
        blurb:
          "Courts that had bookings in the period, busiest first.",
        sameSumsAs: "utilization",
        href: "/desk/reports/sold",
        adminHref: "/admin/reports/sold",
      },
      {
        id: "unsold",
        title: "Not Sold Courts",
        blurb:
          "Courts with no bookings in the period, and when each was last booked.",
        sameSumsAs: "utilization",
        href: "/desk/reports/unsold",
        adminHref: "/admin/reports/unsold",
      },
      {
        id: "moves",
        title: "Moved Bookings",
        blurb:
          "How many bookings customers moved, and the reasons they gave — and how many of those were paid upgrades.",
        href: "/desk/reports/moves",
      },
      {
        id: "rejections",
        title: "Declined Bookings",
        href: "/desk/reports/declines",
        blurb:
          "Payments the desk turned down, against how many it checked, and the reasons given. What a venue reads when the same reason keeps coming back.",
      },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    reports: [
      {
        id: "takings",
        title: "Takings",
        blurb:
          "What your customers paid you, by day, week, month, quarter, half or year — with the platform fee inside it set apart.",
        href: "/desk/reports/takings",
      },
      {
        id: "losses",
        title: "Missed Income",
        blurb: "What your open, unsold hours would have earned.",
        href: "/desk/reports/missed",
        sameSumsAs: "utilization",
      },
      {
        id: "commissions",
        title: "Platform commission",
        blurb:
          "What the platform charged over a date range. The billing reference attaches here once billing is built.",
        ownerOnly: true,
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    reports: [
      {
        id: "changes",
        title: "Court Changes",
        blurb: "Every change to your courts: what it was, what it became, who changed it and why.",
        href: "/desk/reports/changes",
      },
      {
        id: "mix",
        title: "Court Mix",
        blurb: "Your courts by venue type, and the sports and events each is set up for.",
        href: "/desk/reports/mix",
      },
    ],
  },
];
