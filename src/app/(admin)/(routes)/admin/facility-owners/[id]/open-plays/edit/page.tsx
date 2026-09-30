"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import AdminOpenPlayFormView from "../../../../../../components/views/AdminOpenPlayFormView";

function Page() {
  const params = useParams<{ id: string }>();

  // The form reads ?id= from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <AdminOpenPlayFormView facilityOwnerId={params.id ?? ""} />
    </Suspense>
  );
}

export default Page;
