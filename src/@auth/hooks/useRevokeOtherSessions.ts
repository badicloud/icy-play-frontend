import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { ApiError } from "@/services/api";
import { revokeOtherSessions } from "../sessionsApi";
import { activeSessionsQueryKey } from "./useActiveSessions";

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: activeSessionsQueryKey });
      enqueueSnackbar(
        result.revokedSessions === 1
          ? "1 other device has been signed out."
          : `${result.revokedSessions} other devices have been signed out.`,
        { variant: "success" },
      );
    },
    onError: (error: ApiError) => {
      enqueueSnackbar(error.message, { variant: "error" });
    },
  });
}
