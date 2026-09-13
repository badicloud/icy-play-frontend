import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelContract,
  getFacilityOwnerActivity,
  renewContract,
  replaceContractDocument,
  updateContractRates,
  updateContractTerm,
  updateFacility,
  updateFacilityHours,
  updateFacilityOwnerBusiness,
  type RenewContractPayload,
  type UpdateBusinessPayload,
  type UpdateFacilityPayload,
  type UpdateHoursPayload,
  type UploadedFile,
} from "../adminApi";
import { adminFacilityOwnerQueryKey } from "./useAdminFacilityOwner";
import { adminFacilityOwnersQueryKey } from "./useAdminFacilityOwners";

export function facilityOwnerActivityQueryKey(id: string) {
  return [...adminFacilityOwnersQueryKey, "activity", id] as const;
}

export function useFacilityOwnerActivity(id: string) {
  return useQuery({
    queryKey: facilityOwnerActivityQueryKey(id),
    queryFn: () => getFacilityOwnerActivity(id),
    enabled: id !== "",
  });
}

/**
 * Every edit refreshes both the detail and the activity trail: a change the
 * reader cannot see recorded looks like a change that was not recorded.
 */
function useEdit<TPayload>(id: string, mutationFn: (payload: TPayload) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminFacilityOwnerQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: facilityOwnerActivityQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey });
    },
  });
}

export function useUpdateBusiness(id: string) {
  return useEdit<UpdateBusinessPayload>(id, (payload) => updateFacilityOwnerBusiness(id, payload));
}

export function useUpdateFacility(id: string, facilityId: string) {
  return useEdit<UpdateFacilityPayload>(id, (payload) => updateFacility(id, facilityId, payload));
}

export function useUpdateHours(id: string, facilityId: string) {
  return useEdit<UpdateHoursPayload>(id, (payload) => updateFacilityHours(id, facilityId, payload));
}

export function useRenewContract(id: string) {
  return useEdit<RenewContractPayload>(id, (payload) => renewContract(id, payload));
}

export function useReplaceAgreement(id: string) {
  return useEdit<{ contractId: string; document: UploadedFile; reason: string | null }>(
    id,
    ({ contractId, document, reason }) =>
      replaceContractDocument(id, contractId, { document, reason }),
  );
}

export function useUpdateContractTerm(id: string) {
  return useEdit<{
    contractId: string;
    startDate: string;
    endDate: string;
    notes: string | null;
    reason: string | null;
  }>(id, ({ contractId, ...payload }) => updateContractTerm(id, contractId, payload));
}

export function useUpdateContractRates(id: string) {
  return useEdit<{
    contractId: string;
    platformHourlyRate: number;
    commissionPercentage: number;
    reason: string | null;
  }>(id, ({ contractId, ...payload }) => updateContractRates(id, contractId, payload));
}

export function useCancelContract(id: string) {
  return useEdit<{ contractId: string; reason: string | null }>(id, ({ contractId, reason }) =>
    cancelContract(id, contractId, reason),
  );
}
