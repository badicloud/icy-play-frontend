"use client";

import { useParams, useSearchParams } from "next/navigation";
import UpgradeCheckout from "../../../components/ui/UpgradeCheckout";

function Page() {
  const params = useParams<{ bookingId: string }>();
  const search = useSearchParams();

  return (
    <UpgradeCheckout
      bookingId={params.bookingId ?? ""}
      bookableCourtId={search.get("court") ?? ""}
      hours={search.get("hours") ?? ""}
    />
  );
}

export default Page;
