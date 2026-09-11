import { useQuery } from "@tanstack/react-query";
import { getAmenities } from "../adminApi";

export const amenitiesQueryKey = ["admin", "amenities"] as const;

export function useAmenities() {
  return useQuery({
    queryKey: amenitiesQueryKey,
    queryFn: getAmenities,
    // A seeded lookup: it changes when someone adds a row, not between renders.
    staleTime: 30 * 60 * 1000,
  });
}
