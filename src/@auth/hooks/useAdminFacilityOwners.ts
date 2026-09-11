import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminFacilityOwners, type AdminFacilityOwnerQuery } from "../adminApi";

export const adminFacilityOwnersQueryKey = ["admin", "facility-owners"] as const;

export function useAdminFacilityOwners(query: AdminFacilityOwnerQuery) {
  return useQuery({
    queryKey: [...adminFacilityOwnersQueryKey, query],
    queryFn: () => getAdminFacilityOwners(query),
    // Keeps the current page on screen while the next one loads, instead of
    // collapsing the table to a spinner on every keystroke.
    placeholderData: keepPreviousData,
  });
}
