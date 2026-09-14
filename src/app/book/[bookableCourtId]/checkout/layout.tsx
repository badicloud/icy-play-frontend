import type { Metadata } from "next";
import AuthGuard from "@auth/AuthGuard";

export const metadata: Metadata = {
  title: "Check your booking",
  // Somebody's own booking is not for a search engine to hold a copy of.
  robots: { index: false, follow: false, nocache: true },
};

function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

export default Layout;
