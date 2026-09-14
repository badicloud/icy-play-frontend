"use client";

import { useParams } from "next/navigation";
import CheckoutReview from "../../../components/ui/CheckoutReview";

function Page() {
  const params = useParams<{ bookableCourtId: string }>();

  return <CheckoutReview bookableCourtId={params.bookableCourtId ?? ""} />;
}

export default Page;
