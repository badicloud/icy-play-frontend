"use client";

import { Suspense } from "react";
import DeskOpenPlayFormView from "../../../../components/views/DeskOpenPlayFormView";

function Page() {
  // The form reads ?id= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <DeskOpenPlayFormView />
    </Suspense>
  );
}

export default Page;
