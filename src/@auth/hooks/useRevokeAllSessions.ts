import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { ApiError } from "@/services/api";
import { revokeAllSessions } from "../sessionsApi";

/**
 * Ends every session including this one, so the local session is cleared and
 * the visitor is sent home. There is no list left to invalidate.
 */
export function useRevokeAllSessions(onSignedOut: () => Promise<void> | void) {
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: async (result) => {
      enqueueSnackbar(
        result.revokedSessions === 1
          ? "You have been signed out."
          : `Signed out of all ${result.revokedSessions} devices.`,
        { variant: "success" },
      );
      await onSignedOut();
    },
    onError: (error: ApiError) => {
      enqueueSnackbar(error.message, { variant: "error" });
    },
  });
}
