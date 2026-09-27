import { Suspense } from "react";
import type { Metadata } from "next";
import ReportsNav from "@/app/(desk)/components/ReportsNav";
import { AdminReportScope } from "@/app/(desk)/components/reportScope";

export const metadata: Metadata = { title: "Reports" };

/**
 * The same shell the desk's reports sit in, with the same menu: the admin
 * reads the same reports, across every venue or one facility owner's.
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      {/* The owner and venue picked live in the address; Suspense because that
          is read on the client. */}
      <Suspense>
        <AdminReportScope>
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <ReportsNav variant="admin" />
            <div className="min-w-0">{children}</div>
          </div>
        </AdminReportScope>
      </Suspense>
    </main>
  );
}

export default Layout;
