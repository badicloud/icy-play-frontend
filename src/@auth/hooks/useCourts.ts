import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourt,
  getCourts,
  getFacilityInventory,
  liftMaintenance,
  setCourtMaintenance,
  setFacilityMaintenance,
  type CreateCourtPayload,
  type SetMaintenancePayload,
} from "../courtApi";
import { adminFacilityOwnersQueryKey } from "./useAdminFacilityOwners";

export function courtsQueryKey(facilityId: string) {
  return [...adminFacilityOwnersQueryKey, "courts", facilityId] as const;
}

export function useCourts(facilityId: string) {
  return useQuery({
    queryKey: courtsQueryKey(facilityId),
    queryFn: () => getCourts(facilityId),
    enabled: facilityId !== "",
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCourtPayload) => createCourt(payload),
    // A new court may also have created a facility, so the owner's detail and
    // the list of owners are both out of date.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey }),
  });
}

/**
 * Both levels invalidate the same court list: closing a facility changes every
 * court inside it, and the list is what shows that.
 */
export function useSetMaintenance(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courtId,
      payload,
    }: {
      /** Null closes the whole facility. */
      courtId: string | null;
      payload: SetMaintenancePayload;
    }) =>
      courtId === null
        ? setFacilityMaintenance(facilityId, payload)
        : setCourtMaintenance(courtId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courtsQueryKey(facilityId) }),
  });
}

export function useLiftMaintenance(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodId: string) => liftMaintenance(periodId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courtsQueryKey(facilityId) }),
  });
}

export const facilityInventoryQueryKey = ["admin", "facility-inventory"] as const;

export function useFacilityInventory(query: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [...facilityInventoryQueryKey, query],
    queryFn: () => getFacilityInventory(query),
    // Keeps the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
