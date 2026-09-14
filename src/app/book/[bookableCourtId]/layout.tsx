import type { Metadata } from "next";

export const metadata: Metadata = { title: "Book a court" };

function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

export default Layout;
