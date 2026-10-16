"use client";

import { Suspense } from "react";
import DeskMatchesView from "../../../../components/views/DeskMatchesView";

function Page() {
  // The view reads ?openPlay= and ?date= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <DeskMatchesView />
    </Suspense>
  );
}

export default Page;
