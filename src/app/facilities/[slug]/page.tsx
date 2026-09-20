"use client";

import { useParams } from "next/navigation";
import FacilityCourts from "../../components/ui/FacilityCourts";

function Page() {
  const params = useParams<{ slug: string }>();

  return <FacilityCourts slug={params.slug ?? ""} />;
}

export default Page;
