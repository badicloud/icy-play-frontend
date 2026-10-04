"use client";

import { Suspense } from "react";
import DeskCheckInView from "../../../../components/views/DeskCheckInView";

function Page() {
  // The view reads ?openPlay= and ?date= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <DeskCheckInView />
    </Suspense>
  );
}

export default Page;
