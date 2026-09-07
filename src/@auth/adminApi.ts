import { apiClient, API_ENDPOINTS } from "@/services/api";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  roles: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  lockoutEnd: string | null;
  createdAt: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminUserQuery = {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

/**
 * The list endpoint answers with data alongside pagination rather than the
 * single-resource { data, meta } envelope, so it is read without unwrapping.
 */
type AdminUserListResponse = {
  data: AdminUser[];
  pagination: Pagination;
};

export function getAdminUsers(query: AdminUserQuery) {
  return apiClient.get<AdminUserListResponse>(API_ENDPOINTS.ADMIN.USERS, {
    query: {
      search: query.search || undefined,
      role: query.role || undefined,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    },
    unwrapData: false,
  });
}

export const roleLabels: Record<string, string> = {
  Customer: "Customer",
  FacilityOwner: "Facility owner",
  PlatformAdmin: "Platform admin",
};
