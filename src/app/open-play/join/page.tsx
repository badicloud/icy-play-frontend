import { Suspense } from "react";
import OpenPlayJoinView from "../../components/ui/OpenPlayJoinView";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = {
  ...generateMetadata({ title: "Join an open play", path: "/open-play/join" }),
  robots: { index: false, follow: false },
};

function Page() {
  // The view reads ?openPlay= and ?date= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <OpenPlayJoinView />
    </Suspense>
  );
}

export default Page;
