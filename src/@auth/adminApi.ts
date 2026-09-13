import { apiClient, API_ENDPOINTS } from "@/services/api";
import type { UploadSignature } from "./cloudinaryUpload";

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

export type FacilityOwnerStatus =
  | "Pending"
  | "Commenced"
  | "Expired"
  | "Suspended";

export type AdminFacilityOwner = {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  billingPhone: string | null;
  status: FacilityOwnerStatus;
  facilityCount: number;
  contractStartDate: string | null;
  contractEndDate: string | null;
  createdAt: string;
};

export type AdminFacilityOwnerQuery = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

type AdminFacilityOwnerListResponse = {
  data: AdminFacilityOwner[];
  pagination: Pagination;
};

export function getAdminFacilityOwners(query: AdminFacilityOwnerQuery) {
  return apiClient.get<AdminFacilityOwnerListResponse>(API_ENDPOINTS.ADMIN.FACILITY_OWNERS, {
    query: {
      search: query.search || undefined,
      status: query.status || undefined,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    },
    unwrapData: false,
  });
}

/**
 * Status is derived from contract dates on the server, so these labels explain
 * a state rather than name a column somebody can edit.
 */
export const facilityOwnerStatusLabels: Record<FacilityOwnerStatus, string> = {
  Pending: "Pending",
  Commenced: "Commenced",
  Expired: "Expired",
  Suspended: "Suspended",
};


export type UpdateBusinessPayload = {
  businessName: string;
  billingEmail: string;
  billingPhone: string | null;
  businessRegistrationNumber: string | null;
  reason: string | null;
};

export function updateFacilityOwnerBusiness(id: string, payload: UpdateBusinessPayload) {
  return apiClient.put<void, UpdateBusinessPayload>(
    API_ENDPOINTS.ADMIN.FACILITY_OWNER_BUSINESS(id),
    payload,
  );
}

export type UpdateFacilityPayload = {
  name: string;
  description: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
  contactPhone: string | null;
  contactEmail: string | null;
  safetyMeasures: string | null;
  houseRules: string | null;
  amenityIds: string[];
  photos: PhotoPayload[];
  reason: string | null;
};

export function updateFacility(id: string, facilityId: string, payload: UpdateFacilityPayload) {
  return apiClient.put<void, UpdateFacilityPayload>(
    API_ENDPOINTS.ADMIN.FACILITY_OWNER_FACILITY(id, facilityId),
    payload,
  );
}

export type UpdateHoursPayload = {
  operatingHours: { dayOfWeek: number; opensAt: string | null; closesAt: string | null }[];
  reason: string | null;
};

export function updateFacilityHours(id: string, facilityId: string, payload: UpdateHoursPayload) {
  return apiClient.put<void, UpdateHoursPayload>(
    API_ENDPOINTS.ADMIN.FACILITY_OWNER_FACILITY_HOURS(id, facilityId),
    payload,
  );
}

export type RenewContractPayload = {
  startDate: string;
  endDate: string;
  notes: string | null;
  document: UploadedFile;
  reason: string | null;
};

export function renewContract(id: string, payload: RenewContractPayload) {
  return apiClient.post<void, RenewContractPayload>(
    API_ENDPOINTS.ADMIN.FACILITY_OWNER_CONTRACTS(id),
    payload,
  );
}

export function replaceContractDocument(
  id: string,
  contractId: string,
  payload: { document: UploadedFile; reason: string | null },
) {
  return apiClient.put<void, { document: UploadedFile; reason: string | null }>(
    API_ENDPOINTS.ADMIN.CONTRACT_DOCUMENT(id, contractId),
    payload,
  );
}

export function cancelContract(id: string, contractId: string, reason: string | null) {
  return apiClient.post<void, { reason: string | null }>(
    API_ENDPOINTS.ADMIN.CANCEL_CONTRACT(id, contractId),
    { reason },
  );
}

/** One recorded change. Old and new carry only the fields that moved. */
export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string;
  oldValuesJson: string | null;
  newValuesJson: string | null;
  reason: string | null;
  createdAt: string;
};

export function getFacilityOwnerActivity(id: string) {
  return apiClient.get<ActivityEntry[]>(API_ENDPOINTS.ADMIN.FACILITY_OWNER_ACTIVITY(id));
}

/** Plain English for what the trail records, so a reader is not left with a constant. */
export const activityActionLabels: Record<string, string> = {
  FacilityOwnerOnboarded: "Onboarded",
  FacilityOwnerBusinessUpdated: "Business details changed",
  FacilityOwnerInvitationSent: "Invitation sent",
  FacilityUpdated: "Facility details changed",
  FacilityAmenitiesUpdated: "Amenities changed",
  FacilityPhotosUpdated: "Photos changed",
  FacilityHoursUpdated: "Opening hours changed",
  ContractCommenced: "Contract commenced",
  ContractCancelled: "Contract cancelled",
  ContractDocumentReplaced: "Signed agreement replaced",
};

export const roleLabels: Record<string, string> = {
  Customer: "Customer",
  FacilityOwner: "Facility owner",
  PlatformAdmin: "Platform admin",
};

export type Amenity = {
  id: string;
  key: string;
  name: string;
  category: string;
  displayOrder: number;
};

export function getAmenities() {
  return apiClient.get<Amenity[]>(API_ENDPOINTS.ADMIN.AMENITIES);
}

/**
 * The API signs an upload for a purpose, not for a folder the caller names.
 * The signature commits to the folder, so a free-text destination would let a
 * caller scatter uploads anywhere in the Cloudinary account.
 */
export type UploadPurpose =
  | "facility-owner-document"
  | "facility-photo"
  | "court-photo"
  | "contract-document";

export function createUploadSignature(purpose: UploadPurpose) {
  return apiClient.post<UploadSignature, { purpose: UploadPurpose }>(
    API_ENDPOINTS.ADMIN.UPLOAD_SIGNATURE,
    { purpose },
  );
}

export type OwnerAccountDetail = {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type OwnerDocumentDetail = {
  id: string;
  documentType: string;
  publicId: string;
  secureUrl: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
  createdAt: string;
};

export type FacilityAmenityDetail = {
  id: string;
  key: string;
  name: string;
  category: string;
};

export type FacilityOperatingHourDetail = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
};

export type FacilityDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
  contactPhone: string | null;
  contactEmail: string | null;
  safetyMeasures: string | null;
  houseRules: string | null;
  isActive: boolean;
  photos: PhotoItem[];
  amenities: FacilityAmenityDetail[];
  operatingHours: FacilityOperatingHourDetail[];
  createdAt: string;
  updatedAt: string | null;
};

/** A picture being sent to the API: what the browser got back from Cloudinary. */
export type PhotoPayload = {
  publicId: string;
  secureUrl: string;
  caption: string | null;
  displayOrder: number;
  isCover: boolean;
};

/** A picture already stored, as the API reads it back. */
export type PhotoItem = {
  id: string;
  publicId: string;
  secureUrl: string;
  caption: string | null;
  displayOrder: number;
  isCover: boolean;
};

/** A file already in Cloudinary, described by what the browser posted back. */
export type UploadedFile = {
  publicId: string;
  secureUrl: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
};

export type ContractDetail = {
  id: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  commencedByUserId: string;
  commencedByName: string | null;
  cancelledAt: string | null;
  isLiveToday: boolean;
  /** Null on terms commenced before an agreement was required. */
  document: UploadedFile | null;
  createdAt: string;
};

/** Where the owner sits between "encoded by an admin" and "signed in". */
export type InvitationStatus = {
  isAccepted: boolean;
  lastSentAt: string | null;
  expiresAt: string | null;
  hasLiveInvitation: boolean;
};

export type FacilityOwnerDetail = {
  id: string;
  userId: string;
  businessName: string;
  billingEmail: string;
  billingPhone: string | null;
  businessRegistrationNumber: string | null;
  isActive: boolean;
  status: FacilityOwnerStatus;
  createdAt: string;
  updatedAt: string | null;
  owner: OwnerAccountDetail;
  documents: OwnerDocumentDetail[];
  facilities: FacilityDetail[];
  contracts: ContractDetail[];
  invitation: InvitationStatus;
};

export function resendFacilityOwnerInvitation(id: string) {
  return apiClient.post<void, Record<string, never>>(
    API_ENDPOINTS.ADMIN.RESEND_INVITATION(id),
    {},
  );
}

export function getAdminFacilityOwner(id: string) {
  return apiClient.get<FacilityOwnerDetail>(API_ENDPOINTS.ADMIN.FACILITY_OWNER(id));
}

export type OnboardFacilityOwnerPayload = {
  owner: { fullName: string; email: string; phoneNumber: string | null };
  business: {
    businessName: string;
    billingEmail: string;
    billingPhone: string | null;
    businessRegistrationNumber: string | null;
  };
  documents: {
    documentType: string;
    publicId: string;
    secureUrl: string;
    fileName: string;
    contentType: string;
    sizeInBytes: number;
  }[];
  facility: {
    name: string;
    description: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string;
    postalCode: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
    timeZone: string;
    contactPhone: string | null;
    contactEmail: string | null;
    safetyMeasures: string | null;
    houseRules: string | null;
    amenityIds: string[];
    photos: PhotoPayload[];
  };
  operatingHours: {
    dayOfWeek: number;
    opensAt: string | null;
    closesAt: string | null;
  }[];
  contract: {
    startDate: string;
    endDate: string;
    notes: string | null;
    document: UploadedFile;
  };
};

export type OnboardedFacilityOwner = {
  userId: string;
  facilityOwnerId: string;
  facilityId: string;
  facilitySlug: string;
  status: FacilityOwnerStatus;
  /** False when Mailjet was unreachable. The owner then has no link yet. */
  invitationEmailSent: boolean;
};

export function onboardFacilityOwner(payload: OnboardFacilityOwnerPayload) {
  return apiClient.post<OnboardedFacilityOwner, OnboardFacilityOwnerPayload>(
    API_ENDPOINTS.ADMIN.FACILITY_OWNERS,
    payload,
  );
}
