"use client";

import { useParams, useSearchParams } from "next/navigation";
import CourtDetail from "../../components/ui/CourtDetail";

function Page() {
  const params = useParams<{ courtId: string }>();
  const search = useSearchParams();

  return (
    <CourtDetail
      courtId={params.courtId ?? ""}
      sportKey={search.get("sport") ?? ""}
      division={Number(search.get("division") ?? 1) || 1}
    />
  );
}

export default Page;
