import ReportsNav from "../../../components/ReportsNav";

/**
 * The shell every report sits in: the side menu, and the column beside it.
 *
 * The page chrome lives here rather than in each report so a second report
 * cannot arrive a little narrower or a little further down the page than the
 * first. Each report states its own breadcrumb and heading, because those are
 * the parts that differ.
 *
 * The menu is above the content on a narrow screen rather than beside it —
 * a sidebar that becomes a squeezed column reads as a mistake.
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Wider than the rest of the desk on purpose: a report is a table of
          numbers read at arm's length, and the columns need the room the type
          size takes up. */}
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <ReportsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}

export default Layout;
