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
      },
      {
        id: "hours",
        title: "Sold Hours",
        blurb:
          "How many hours you sold each day, week or month, drawn as a line — and the days a court was under maintenance.",
        sameSumsAs: "utilization",
        href: "/desk/reports/hours",
      },
      {
        id: "sold",
        title: "Sold Courts",
        blurb:
          "Courts that had bookings in the period, busiest first.",
        sameSumsAs: "utilization",
        href: "/desk/reports/sold",
      },
      {
        id: "unsold",
        title: "Not Sold Courts",
        blurb:
          "Courts with no bookings in the period, and when each was last booked.",
        sameSumsAs: "utilization",
        href: "/desk/reports/unsold",
      },
      {
        id: "availability",
        title: "What was free",
        blurb:
          "How many bookable courts stood free across a date range, and how many bookings were taken against them.",
      },
      {
        id: "moves",
        title: "Bookings moved",
        blurb:
          "How many bookings were carried to another court, another day or another hour — and how many of those were paid upgrades.",
      },
      {
        id: "rejections",
        title: "Bookings turned down",
        blurb:
          "Every booking the desk rejected, with the reason it was given. What a venue reads when the same reason keeps coming back.",
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
          "What you took over a date range, by day, week, month, quarter, half or year.",
        ownerOnly: true,
      },
      {
        id: "losses",
        title: "What the empty hours cost",
        blurb:
          "The hours that stood open and sold nothing, priced at what they would have fetched. The same filters as takings.",
        ownerOnly: true,
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
        title: "What changed",
        blurb:
          "Courts and bookable courts as they were added, renamed, re-marked and retired, with the date each happened.",
      },
      {
        id: "mix",
        title: "Indoor, outdoor and events",
        blurb: "What you have, counted by venue type and by what each court is set up for.",
      },
    ],
  },
];
