import type { Metadata } from "next";
import AuthGuard from "@auth/AuthGuard";

export const metadata: Metadata = {
  title: "My open plays",
  robots: { index: false, follow: false, nocache: true },
};

function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

export default Layout;
