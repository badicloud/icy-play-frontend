import type { Metadata } from "next";
import DemoView from "./DemoView";
import OnlyFor from "./OnlyFor";

export const metadata: Metadata = {
  title: "IcyPlay — walkthrough",
  // Not a page for search engines to hold a copy of.
  robots: { index: false, follow: false, nocache: true },
};

function Page() {
  return (
    <OnlyFor>
      <DemoView />
    </OnlyFor>
  );
}

export default Page;
