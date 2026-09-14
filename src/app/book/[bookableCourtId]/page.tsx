"use client";

import { useParams } from "next/navigation";
import BookingPage from "../../components/ui/BookingPage";

function Page() {
  const params = useParams<{ bookableCourtId: string }>();

  return <BookingPage bookableCourtId={params.bookableCourtId ?? ""} />;
}

export default Page;
