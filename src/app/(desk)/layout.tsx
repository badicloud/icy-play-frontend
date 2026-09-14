import type { Metadata } from "next";
import RoleGuard from "@auth/RoleGuard";
import DeskShell from "./components/DeskShell";

export const metadata: Metadata = {
  title: "Venue desk",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Owners and attendants alike. An owner attends every venue they own and an
 * attendant the ones they are put on; which venues either of them sees is
 * worked out on the server from who they are.
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={["FacilityOwner", "FacilityAttendant"]}>
      <DeskShell>{children}</DeskShell>
    </RoleGuard>
  );
}

export default Layout;
