import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourt,
  getCourt,
  getCourtInventory,
  getCourts,
  getFacilityInventory,
  liftMaintenance,
  setCourtMaintenance,
  setFacilityMaintenance,
  updateCourt,
  updateCourtDivisions,
  updateCourtPricing,
  type CreateCourtPayload,
  type SetMaintenancePayload,
  type UpdateCourtPayload,
  type UpdateCourtDivisionsPayload,
  type CourtInventoryQuery,
  type UpdateCourtPricingPayload,
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

export function courtQueryKey(courtId: string) {
  return [...adminFacilityOwnersQueryKey, "court", courtId] as const;
}

export function useCourt(courtId: string) {
  return useQuery({
    queryKey: courtQueryKey(courtId),
    queryFn: () => getCourt(courtId),
    enabled: courtId !== "",
  });
}

export function useUpdateCourt(courtId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCourtPayload) => updateCourt(courtId, payload),
    // A court's name, sports and photos all show on the facility's page and in
    // the inventory, so everything under the owners key is now stale.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey });
      await queryClient.invalidateQueries({ queryKey: facilityInventoryQueryKey });
    },
  });
}

export function useUpdateCourtDivisions(courtId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCourtDivisionsPayload) =>
      updateCourtDivisions(courtId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey }),
  });
}

export function useUpdateCourtPricing(courtId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCourtPricingPayload) => updateCourtPricing(courtId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey }),
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
 * Closing anything is read in three places — the court's own page, the
 * facility's list of courts, and the inventory's bookable column — so all
 * three are refreshed rather than only the one the button was pressed on.
 */
async function refreshClosures(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey });
  await queryClient.invalidateQueries({ queryKey: facilityInventoryQueryKey });
}

/**
 * Both levels go through here: closing a facility changes every court inside
 * it, and a court page that still reads "Bookable" afterwards is worse than no
 * page at all.
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
    onSuccess: () => refreshClosures(queryClient),
  });
}

export function useLiftMaintenance(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodId: string) => liftMaintenance(periodId),
    onSuccess: () => refreshClosures(queryClient),
  });
}

export const courtInventoryQueryKey = ["admin", "court-inventory"] as const;

export function useCourtInventory(query: CourtInventoryQuery) {
  return useQuery({
    queryKey: [...courtInventoryQueryKey, query],
    queryFn: () => getCourtInventory(query),
    // Keeps the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
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
