"use client";

import { useParams } from "next/navigation";
import AdminCourtDetailView from "../../../../components/views/AdminCourtDetailView";

function Page() {
  const params = useParams<{ courtId: string }>();

  return <AdminCourtDetailView courtId={params.courtId ?? ""} />;
}

export default Page;
