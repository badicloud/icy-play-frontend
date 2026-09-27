"use client";

import { Suspense } from "react";
import AdminReportsView from "../../../components/views/AdminReportsView";

/** Suspense because the filters live in the address, which is read on the client. */
function Page() {
  return (
    <Suspense>
      <AdminReportsView />
    </Suspense>
  );
}

export default Page;
