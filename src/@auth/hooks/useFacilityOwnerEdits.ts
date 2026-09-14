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
  checkAttendantEmail,
  getFacilityAttendants,
  inviteAttendant,
  removeAttendant,
  resendAttendantInvitation,
  updateFacilityOwnerBusiness,
  updatePaymentDetails,
  type InviteAttendantPayload,
  type PaymentDetailsPayload,
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

/** Who works one venue's desk. Its own key per venue, not per owner. */
export function facilityAttendantsQueryKey(id: string, facilityId: string) {
  return ["admin", "facility-owner", id, "attendants", facilityId] as const;
}

export function useFacilityAttendants(id: string, facilityId: string) {
  return useQuery({
    queryKey: facilityAttendantsQueryKey(id, facilityId),
    queryFn: () => getFacilityAttendants(id, facilityId),
    enabled: id !== "" && facilityId !== "",
  });
}

/**
 * Whether an address can be put on this desk.
 *
 * Its own key per address, so a typist who backspaces to something they have
 * already tried gets the answer back without asking again.
 */
export function useAttendantEmailCheck(id: string, facilityId: string, email: string) {
  return useQuery({
    queryKey: ["admin", "facility-owner", id, "attendants", facilityId, "check", email],
    queryFn: () => checkAttendantEmail(id, facilityId, email),
    enabled: id !== "" && facilityId !== "" && email.includes("@"),
    // Somebody signing up in the seconds between the check and the save is
    // caught by the server, which refuses it again on the way in.
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useInviteAttendant(id: string, facilityId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (payload: InviteAttendantPayload) => inviteAttendant(id, facilityId, payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: facilityAttendantsQueryKey(id, facilityId) });
      // The owner's activity trail records who was added, so it is stale too.
      void client.invalidateQueries({ queryKey: adminFacilityOwnerQueryKey(id) });
    },
  });
}

/**
 * Sends an attendant who has not claimed their account another link.
 *
 * The roster is stale afterwards: it carries how many invitations have gone
 * out, and one more just has.
 */
export function useResendAttendantInvitation(id: string, facilityId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (attendantId: string) => resendAttendantInvitation(id, facilityId, attendantId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: facilityAttendantsQueryKey(id, facilityId) });
      void client.invalidateQueries({ queryKey: adminFacilityOwnerQueryKey(id) });
    },
  });
}

export function useRemoveAttendant(id: string, facilityId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ attendantId, reason }: { attendantId: string; reason: string | null }) =>
      removeAttendant(id, facilityId, attendantId, reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: facilityAttendantsQueryKey(id, facilityId) });
      void client.invalidateQueries({ queryKey: adminFacilityOwnerQueryKey(id) });
    },
  });
}

export function useUpdatePaymentDetails(id: string) {
  return useEdit<PaymentDetailsPayload>(id, (payload) => updatePaymentDetails(id, payload));
}

export function useCancelContract(id: string) {
  return useEdit<{ contractId: string; reason: string | null }>(id, ({ contractId, reason }) =>
    cancelContract(id, contractId, reason),
  );
}
