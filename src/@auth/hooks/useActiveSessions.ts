import { useQuery } from "@tanstack/react-query";
import { getActiveSessions } from "../sessionsApi";

export const activeSessionsQueryKey = ["auth", "active-sessions"] as const;

export function useActiveSessions(enabled = true) {
  return useQuery({
    queryKey: activeSessionsQueryKey,
    queryFn: getActiveSessions,
    enabled,
    // Sessions change on other devices, so a cached list goes stale quietly.
    staleTime: 30 * 1000,
  });
}
