import { useQuery } from "@tanstack/react-query";
import {
  getPlatformSnapshot,
  getPlatformUtilization,
  getReportOwners,
  type PlatformRange,
  type PlatformScope,
} from "../platformReportApi";

const platformReportsKey = ["admin", "reports"] as const;

/** Every facility owner and their venues. Long-lived: onboarding is rare. */
export function useReportOwners(enabled = true) {
  return useQuery({
    queryKey: [...platformReportsKey, "owners"],
    queryFn: getReportOwners,
    enabled,
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

/** Court utilisation across the scope. Long-lived, the same as the desk's. */
export function usePlatformUtilization(query: PlatformRange, enabled = true) {
  return useQuery({
    queryKey: [...platformReportsKey, "utilization", query],
    queryFn: () => getPlatformUtilization(query),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
