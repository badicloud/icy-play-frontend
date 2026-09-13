import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHoliday,
  getHolidays,
  setHolidayActive,
  updateHoliday,
  type HolidayPayload,
} from "../holidayApi";

export function holidaysQueryKey(includeRetired: boolean) {
  return ["admin", "holidays", { includeRetired }] as const;
}

export function useHolidays(includeRetired = false) {
  return useQuery({
    queryKey: holidaysQueryKey(includeRetired),
    queryFn: () => getHolidays(includeRetired),
    // A calendar: it changes when someone edits it, not between renders.
    staleTime: 5 * 60 * 1000,
  });
}

function useHolidayMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    // Both the live list and the one including retired days are stale now.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "holidays"] }),
  });
}

export function useCreateHoliday() {
  return useHolidayMutation((payload: HolidayPayload) => createHoliday(payload));
}

export function useUpdateHoliday() {
  return useHolidayMutation(({ id, payload }: { id: string; payload: HolidayPayload }) =>
    updateHoliday(id, payload),
  );
}

export function useSetHolidayActive() {
  return useHolidayMutation(({ id, isActive }: { id: string; isActive: boolean }) =>
    setHolidayActive(id, isActive),
  );
}
