"use client";

import { useMemo } from "react";
import { OpenPlayForm } from "@/app/(desk)/components/views/DeskOpenPlayFormView";
import { useAdminFacilityOwner } from "@auth/hooks/useAdminFacilityOwner";
import { adminOpenPlaySource } from "@auth/deskOpenPlayApi";

/**
 * The desk's open play form, opened by the platform admin for one facility
 * owner. The same fields and the same rules; only the door differs, and the
 * trail leads back to the owner's page rather than to a desk.
 */
function AdminOpenPlayFormView({ facilityOwnerId }: { facilityOwnerId: string }) {
  const owner = useAdminFacilityOwner(facilityOwnerId);
  const businessName = owner.data?.businessName;

  const source = useMemo(
    () => adminOpenPlaySource(facilityOwnerId, businessName),
    [facilityOwnerId, businessName],
  );

  return <OpenPlayForm source={source} />;
}

export default AdminOpenPlayFormView;
