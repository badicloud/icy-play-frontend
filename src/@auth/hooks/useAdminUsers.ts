import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminUsers, type AdminUserQuery } from "../adminApi";

export const adminUsersQueryKey = ["admin", "users"] as const;

export function useAdminUsers(query: AdminUserQuery) {
  return useQuery({
    queryKey: [...adminUsersQueryKey, query],
    queryFn: () => getAdminUsers(query),
    // Keeps the current page on screen while the next one loads, instead of
    // collapsing the table to a spinner on every keystroke.
    placeholderData: keepPreviousData,
  });
}
