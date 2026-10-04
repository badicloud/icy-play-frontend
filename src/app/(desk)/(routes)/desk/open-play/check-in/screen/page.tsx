"use client";

import { Suspense } from "react";
import CheckInScreenView from "../../../../../components/views/CheckInScreenView";

function Page() {
  // The view reads ?openPlay= and ?date= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <CheckInScreenView />
    </Suspense>
  );
}

export default Page;
