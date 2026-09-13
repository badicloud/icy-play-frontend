"use client";

import { useParams } from "next/navigation";
import AdminAddCourtView from "../../../../../../components/views/AdminAddCourtView";

function Page() {
  const params = useParams<{ id: string }>();

  return <AdminAddCourtView facilityOwnerId={params.id ?? ""} />;
}

export default Page;
