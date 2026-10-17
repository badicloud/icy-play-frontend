"use client";

import { Suspense } from "react";
import DeskClaimStubsView from "../../../../components/views/DeskClaimStubsView";

function Page() {
  // The view reads ?openPlay= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <DeskClaimStubsView />
    </Suspense>
  );
}

export default Page;
