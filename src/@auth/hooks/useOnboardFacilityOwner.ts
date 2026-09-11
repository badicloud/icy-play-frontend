import { useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardFacilityOwner } from "../adminApi";
import { adminFacilityOwnersQueryKey } from "./useAdminFacilityOwners";
import { adminUsersQueryKey } from "./useAdminUsers";

export function useOnboardFacilityOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: onboardFacilityOwner,
    onSuccess: () => {
      // Onboarding creates both an owner and the user account behind it, so
      // both lists are now out of date.
      void queryClient.invalidateQueries({ queryKey: adminFacilityOwnersQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
