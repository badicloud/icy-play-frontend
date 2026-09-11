"use client";

import { useParams } from "next/navigation";
import AdminFacilityOwnerDetailView from "../../../../components/views/AdminFacilityOwnerDetailView";

function Page() {
  const params = useParams<{ id: string }>();

  return <AdminFacilityOwnerDetailView facilityOwnerId={params.id ?? ""} />;
}

export default Page;
