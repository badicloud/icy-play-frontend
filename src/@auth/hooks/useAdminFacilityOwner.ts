import { useQuery } from "@tanstack/react-query";
import { getAdminFacilityOwner } from "../adminApi";
import { adminFacilityOwnersQueryKey } from "./useAdminFacilityOwners";

export function adminFacilityOwnerQueryKey(id: string) {
  // Nested under the list key, so invalidating the list after an edit refreshes
  // this detail too.
  return [...adminFacilityOwnersQueryKey, "detail", id] as const;
}

export function useAdminFacilityOwner(id: string) {
  return useQuery({
    queryKey: adminFacilityOwnerQueryKey(id),
    queryFn: () => getAdminFacilityOwner(id),
    enabled: id !== "",
  });
}
