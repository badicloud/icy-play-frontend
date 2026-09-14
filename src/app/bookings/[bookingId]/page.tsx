"use client";

import { useParams } from "next/navigation";
import BookingCheckout from "../../components/ui/BookingCheckout";

function Page() {
  const params = useParams<{ bookingId: string }>();

  return <BookingCheckout bookingId={params.bookingId ?? ""} />;
}

export default Page;
