import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { ApiError } from "@/services/api";
import { revokeSession } from "../sessionsApi";
import { activeSessionsQueryKey } from "./useActiveSessions";

export function useRevokeSession() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeSessionsQueryKey });
      enqueueSnackbar("That device has been signed out.", { variant: "success" });
    },
    onError: (error: ApiError) => {
      enqueueSnackbar(error.message, { variant: "error" });
    },
  });
}
