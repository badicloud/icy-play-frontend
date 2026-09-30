import { Suspense } from "react";
import OpenPlayView from "../components/ui/OpenPlayView";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "Open Play",
  description:
    "Join an open play session on IcyPlay: pay per player instead of renting the whole court, and play with whoever turns up at your level.",
  path: "/open-play",
});

function Page() {
  // The view reads ?id=, ?sport= and ?facility= from the address, which a
  // statically rendered page can only do inside a Suspense boundary.
  return (
    <Suspense>
      <OpenPlayView />
    </Suspense>
  );
}

export default Page;
