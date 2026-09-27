import { useQuery } from "@tanstack/react-query";
import { getPlatformSnapshot, getReportOwners, type PlatformScope } from "../platformReportApi";

const platformReportsKey = ["admin", "reports"] as const;

/** Every facility owner and their venues. Long-lived: onboarding is rare. */
export function useReportOwners() {
  return useQuery({
    queryKey: [...platformReportsKey, "owners"],
    queryFn: getReportOwners,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The platform this minute. Refreshed every minute, the same as the desk's
 * own snapshot: "right now" that is ten minutes old is not right now.
 */
export function usePlatformSnapshot(scope: PlatformScope) {
  return useQuery({
    queryKey: [...platformReportsKey, "snapshot", scope],
    queryFn: () => getPlatformSnapshot(scope),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
