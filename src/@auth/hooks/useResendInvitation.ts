import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resendFacilityOwnerInvitation } from "../adminApi";
import { adminFacilityOwnerQueryKey } from "./useAdminFacilityOwner";

export function useResendInvitation(facilityOwnerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resendFacilityOwnerInvitation(facilityOwnerId),
    // The sent-at and expiry on screen are now stale, so the panel refetches
    // rather than showing yesterday's dates beside a fresh invitation.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminFacilityOwnerQueryKey(facilityOwnerId) }),
  });
}
