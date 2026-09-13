import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSport,
  getSports,
  setSportActive,
  updateSport,
  type SportPayload,
} from "../courtApi";

export function sportsQueryKey(includeRetired: boolean) {
  return ["admin", "sports", { includeRetired }] as const;
}

export function useSports(includeRetired = false) {
  return useQuery({
    queryKey: sportsQueryKey(includeRetired),
    queryFn: () => getSports(includeRetired),
    // A lookup: it changes when someone edits it, not between renders.
    staleTime: 5 * 60 * 1000,
  });
}

function useSportMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    // Both the live list and the one including retired sports are stale now.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sports"] }),
  });
}

export function useCreateSport() {
  return useSportMutation((payload: SportPayload) => createSport(payload));
}

export function useUpdateSport() {
  return useSportMutation(({ id, payload }: { id: string; payload: SportPayload }) =>
    updateSport(id, payload),
  );
}

export function useSetSportActive() {
  return useSportMutation(({ id, isActive }: { id: string; isActive: boolean }) =>
    setSportActive(id, isActive),
  );
}
