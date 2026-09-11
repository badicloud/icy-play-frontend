"use client";

import Link from "next/link";
import { format } from "date-fns";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import MailOutlineOutlined from "@mui/icons-material/MailOutlineOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import { useSnackbar } from "notistack";
import {
  facilityOwnerStatusLabels,
  type ContractDetail,
  type FacilityDetail,
  type FacilityOwnerStatus,
  type InvitationStatus,
  type OwnerDocumentDetail,
} from "@auth/adminApi";
import { useAdminFacilityOwner } from "@auth/hooks/useAdminFacilityOwner";
import { useResendInvitation } from "@auth/hooks/useResendInvitation";
import AdminBreadcrumbs from "../AdminBreadcrumbs";
import { dayNames, directionsUrl } from "../onboarding/draft";
import { documentTypes } from "../onboarding/DocumentUploader";

const statusStyles: Record<FacilityOwnerStatus, string> = {
  Commenced: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Expired: "bg-slate-200 text-slate-600",
  Suspended: "bg-red-100 text-red-700",
};

const statusHints: Record<FacilityOwnerStatus, string> = {
  Commenced: "A contract covers today, so customers can see and book this facility.",
  Pending: "Encoded, but no contract covers today yet. Invisible to customers.",
  Expired: "The last contract has run out. Invisible to customers until it is renewed.",
  Suspended: "Switched off, whatever the contract says.",
};

function formatDate(value: string) {
  return format(new Date(value), "d MMM yyyy");
}

/** "06:00:00" from the API, "06:00" on screen. */
function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentLabel(documentType: string) {
  return documentTypes.find((type) => type.value === documentType)?.label ?? documentType;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right font-semibold text-[#071955]">{value}</span>
    </div>
  );
}

function Blank() {
  return <span className="font-normal text-slate-400">Not set</span>;
}

function FacilityPanel({ facility }: { facility: FacilityDetail }) {
  const address = [
    facility.addressLine1,
    facility.addressLine2,
    facility.city,
    facility.province,
    facility.postalCode,
    facility.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-bold tracking-tight text-slate-950">{facility.name}</h3>
        {!facility.isActive && (
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            Inactive
          </span>
        )}
      </div>
      <p className="mt-1 break-all text-sm text-slate-500">/{facility.slug}</p>

      <div className="mt-4">
        <Row label="Address" value={address} />
        <Row label="Time zone" value={facility.timeZone} />
        <Row label="Contact phone" value={facility.contactPhone ?? <Blank />} />
        <Row label="Contact email" value={facility.contactEmail ?? <Blank />} />
        <Row
          label="Map pin"
          value={
            facility.latitude !== null && facility.longitude !== null ? (
              <a
                href={directionsUrl(String(facility.latitude), String(facility.longitude))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#2563EB] transition hover:text-[#071955]"
              >
                {facility.latitude}, {facility.longitude}
                <OpenInNewOutlined sx={{ fontSize: 14 }} />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 font-normal text-slate-400">
                <PlaceOutlined sx={{ fontSize: 15 }} />
                No pin yet
              </span>
            )
          }
        />
      </div>

      {facility.description && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-[#071955]">Description</h4>
          <p className="mt-1 whitespace-pre-line text-slate-600">{facility.description}</p>
        </div>
      )}

      <div className="mt-5">
        <h4 className="text-sm font-bold text-[#071955]">Amenities</h4>
        {facility.amenities.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">None recorded.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {facility.amenities.map((amenity) => (
              <span
                key={amenity.id}
                title={amenity.category}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-[#1257d5]"
              >
                {amenity.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-bold text-[#071955]">Opening hours</h4>
        <div className="mt-1">
          {facility.operatingHours.map((hour) => (
            <Row
              key={hour.dayOfWeek}
              label={dayNames[hour.dayOfWeek]}
              value={
                hour.opensAt && hour.closesAt ? (
                  `${formatTime(hour.opensAt)} – ${formatTime(hour.closesAt)}`
                ) : (
                  <span className="font-normal text-slate-400">Closed</span>
                )
              }
            />
          ))}
        </div>
      </div>

      {(facility.safetyMeasures || facility.houseRules) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {facility.safetyMeasures && (
            <div>
              <h4 className="text-sm font-bold text-[#071955]">Safety measures</h4>
              <p className="mt-1 whitespace-pre-line text-slate-600">{facility.safetyMeasures}</p>
            </div>
          )}
          {facility.houseRules && (
            <div>
              <h4 className="text-sm font-bold text-[#071955]">House rules</h4>
              <p className="mt-1 whitespace-pre-line text-slate-600">{facility.houseRules}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentRow({ document }: { document: OwnerDocumentDetail }) {
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <DescriptionOutlined sx={{ fontSize: 20 }} className="shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#071955]">{documentLabel(document.documentType)}</p>
        <p className="truncate text-sm text-slate-500">
          {document.fileName} · {formatSize(document.sizeInBytes)} ·{" "}
          {formatDate(document.createdAt)}
        </p>
      </div>
      <a
        href={document.secureUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#2563EB] transition hover:text-[#071955]"
      >
        View
        <OpenInNewOutlined sx={{ fontSize: 14 }} />
      </a>
    </li>
  );
}

function ContractRow({ contract }: { contract: ContractDetail }) {
  return (
    <li className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-[#071955]">
          {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
        </span>
        {contract.cancelledAt ? (
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            Cancelled {formatDate(contract.cancelledAt)}
          </span>
        ) : contract.isLiveToday ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
            Live today
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        Commenced by {contract.commencedByName ?? "an account that no longer exists"} on{" "}
        {formatDate(contract.createdAt)}
      </p>
      {contract.notes && <p className="mt-1 text-sm text-slate-600">{contract.notes}</p>}
    </li>
  );
}

function InvitationPanel({
  invitation,
  facilityOwnerId,
}: {
  invitation: InvitationStatus;
  facilityOwnerId: string;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const resend = useResendInvitation(facilityOwnerId);

  async function handleResend() {
    try {
      await resend.mutateAsync();
      enqueueSnackbar("A fresh invitation is on its way.", { variant: "success" });
    } catch {
      enqueueSnackbar("The invitation could not be sent. Please try again.", {
        variant: "error",
      });
    }
  }

  return (
    <div>
      {invitation.isAccepted ? (
        <p className="flex items-center gap-2 font-semibold text-green-700">
          <CheckCircleOutlined sx={{ fontSize: 18 }} />
          The owner has set their password and taken over this account.
        </p>
      ) : (
        <>
          <p className="flex items-start gap-2 font-semibold text-amber-800">
            <MailOutlineOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
            {invitation.hasLiveInvitation
              ? "Waiting for the owner to open their invitation and set a password."
              : invitation.lastSentAt
                ? "The last invitation ran out before it was used."
                : "No invitation has gone out yet."}
          </p>

          <div className="mt-3">
            {invitation.lastSentAt && (
              <Row label="Last sent" value={formatDate(invitation.lastSentAt)} />
            )}
            {invitation.expiresAt && (
              <Row
                label={invitation.hasLiveInvitation ? "Expires" : "Expired"}
                value={formatDate(invitation.expiresAt)}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resend.isPending}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            <SendOutlined sx={{ fontSize: 16 }} />
            {resend.isPending ? "Sending…" : "Resend invitation"}
          </button>
          <p className="mt-2 text-sm text-slate-500">
            Sending a new one stops the previous link working, so only the newest invitation is
            ever live.
          </p>
        </>
      )}
    </div>
  );
}

function AdminFacilityOwnerDetailView({ facilityOwnerId }: { facilityOwnerId: string }) {
  const owner = useAdminFacilityOwner(facilityOwnerId);
  const detail = owner.data;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <AdminBreadcrumbs
          trail={[
            { label: "Platform admin", href: "/admin" },
            { label: "Facility owners", href: "/admin/facility-owners" },
            // The business name, never the id: a GUID as a crumb tells the
            // reader nothing about where they are.
            { label: detail?.businessName ?? "Loading…" },
          ]}
        />

        {owner.isError ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-bold text-red-700">We couldn&apos;t load this facility owner.</p>
            <p className="mt-1 text-slate-500">
              They may have been removed, or the link may be wrong.
            </p>
            <Link
              href="/admin/facility-owners"
              className="mt-4 inline-block text-sm font-bold text-[#2563EB] transition hover:text-[#071955]"
            >
              Back to facility owners
            </Link>
          </div>
        ) : owner.isPending || !detail ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {detail.businessName}
              </h1>
              <span
                title={statusHints[detail.status]}
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[detail.status]}`}
              >
                {facilityOwnerStatusLabels[detail.status] ?? detail.status}
              </span>
            </div>
            <p className="mt-2 text-slate-500">{statusHints[detail.status]}</p>

            <div className="mt-6 grid gap-4">
              <Section title="Owner">
                <Row label="Name" value={detail.owner.fullName} />
                <Row label="Email" value={detail.owner.email} />
                <Row label="Mobile" value={detail.owner.phoneNumber ?? <Blank />} />
                <Row
                  label="Email verified"
                  value={
                    detail.owner.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700">
                        <CheckCircleOutlined sx={{ fontSize: 16 }} />
                        {detail.owner.emailVerifiedAt
                          ? formatDate(detail.owner.emailVerifiedAt)
                          : "Yes"}
                      </span>
                    ) : (
                      <span
                        title="The owner confirms this themselves through the emailed link."
                        className="inline-flex items-center gap-1.5 text-amber-700"
                      >
                        <ErrorOutlineOutlined sx={{ fontSize: 16 }} />
                        Not yet
                      </span>
                    )
                  }
                />
                <Row
                  label="Account"
                  value={
                    detail.owner.isActive ? (
                      "Active"
                    ) : (
                      <span className="text-red-700">Inactive</span>
                    )
                  }
                />
              </Section>

              <Section title="Account activation">
                <InvitationPanel
                  invitation={detail.invitation}
                  facilityOwnerId={facilityOwnerId}
                />
              </Section>

              <Section title="Business">
                <Row label="Business name" value={detail.businessName} />
                <Row
                  label="Registration number"
                  value={detail.businessRegistrationNumber ?? <Blank />}
                />
                <Row label="Billing email" value={detail.billingEmail} />
                <Row label="Billing phone" value={detail.billingPhone ?? <Blank />} />
                <Row label="Onboarded" value={formatDate(detail.createdAt)} />
              </Section>

              <Section title={`Documents (${detail.documents.length})`}>
                {detail.documents.length === 0 ? (
                  <p className="text-sm text-slate-400">None attached.</p>
                ) : (
                  <ul>
                    {detail.documents.map((document) => (
                      <DocumentRow key={document.id} document={document} />
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={`Contracts (${detail.contracts.length})`}>
                {detail.contracts.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No contract yet, so this owner is not bookable.
                  </p>
                ) : (
                  <ul>
                    {detail.contracts.map((contract) => (
                      <ContractRow key={contract.id} contract={contract} />
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={`Facilities (${detail.facilities.length})`}>
                {detail.facilities.length === 0 ? (
                  <p className="text-sm text-slate-400">No facility recorded.</p>
                ) : (
                  <div className="space-y-8">
                    {detail.facilities.map((facility) => (
                      <FacilityPanel key={facility.id} facility={facility} />
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default AdminFacilityOwnerDetailView;
