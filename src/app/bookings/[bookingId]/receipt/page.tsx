"use client";

import { useParams } from "next/navigation";
import BookingReceiptView from "../../../components/ui/BookingReceiptView";

function Page() {
  const params = useParams<{ bookingId: string }>();

  return <BookingReceiptView bookingId={params.bookingId ?? ""} />;
}

export default Page;
