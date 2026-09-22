"use client";

import { useParams, useSearchParams } from "next/navigation";
import UpgradeCheckout from "../../../components/ui/UpgradeCheckout";

function Page() {
  const params = useParams<{ bookingId: string }>();
  const search = useSearchParams();

  // `hours` is absent, not empty, when the booking is under way: it is not
  // changing its hours, so the move screen sends none and the server keeps the
  // ones it has. That is a different thing from "the customer picked no hours",
  // and the two used to arrive here looking identical — which left the page
  // waiting on a quote it had disabled.
  return (
    <UpgradeCheckout
      bookingId={params.bookingId ?? ""}
      bookableCourtId={search.get("court") ?? ""}
      hours={search.get("hours")}
    />
  );
}

export default Page;
