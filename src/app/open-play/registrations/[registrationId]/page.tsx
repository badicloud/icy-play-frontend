"use client";

import { useParams } from "next/navigation";
import OpenPlayRegistrationView from "../../../components/ui/OpenPlayRegistrationView";

function Page() {
  const params = useParams<{ registrationId: string }>();

  return <OpenPlayRegistrationView registrationId={params.registrationId ?? ""} />;
}

export default Page;
