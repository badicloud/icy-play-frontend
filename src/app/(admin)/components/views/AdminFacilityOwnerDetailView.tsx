"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import MailOutlineOutlined from "@mui/icons-material/MailOutlineOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
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
import ActivityTimeline from "../ActivityTimeline";
import CourtsPanel from "../courts/CourtsPanel";
import BusinessEditDialog from "../edit/BusinessEditDialog";
import CancelContractDialog from "../edit/CancelContractDialog";
import ContractRatesDialog from "../edit/ContractRatesDialog";
import ReplaceAgreementDialog from "../edit/ReplaceAgreementDialog";
import FacilityEditDialog from "../edit/FacilityEditDialog";
import HoursEditDialog from "../edit/HoursEditDialog";
import RenewContractDialog from "../edit/RenewContractDialog";
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

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#164eaa] transition hover:border-slate-300 hover:bg-slate-50"
    >
      <EditOutlined sx={{ fontSize: 15 }} />
      Edit
      <span className="sr-only"> {label}</span>
    </button>
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

function FacilityPanel({
  facility,
  facilityOwnerId,
  onEditDetails,
  onEditHours,
}: {
  facility: FacilityDetail;
  facilityOwnerId: string;
  onEditDetails: () => void;
  onEditHours: () => void;
}) {
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
    // Named so the facility inventory can link straight at this venue; the
    // scroll margin keeps the heading clear of the sticky header.
    <div id={`facility-${facility.id}`} className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-bold tracking-tight text-slate-950">{facility.name}</h3>
          {!facility.isActive && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              Inactive
            </span>
          )}
        </div>
        <EditButton label="facility details" onClick={onEditDetails} />
      </div>

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
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-[#071955]">
            Photos{facility.photos.length > 0 && ` (${facility.photos.length})`}
          </h4>
          <EditButton label="facility photos" onClick={onEditDetails} />
        </div>
        {facility.photos.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">
            No photos yet, so the booking list has nothing to show for this venue.
          </p>
        ) : (
          <ul className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {facility.photos.map((photo) => (
              <li
                key={photo.id}
                className={`overflow-hidden rounded-xl border bg-white ${
                  photo.isCover ? "border-[#2563EB] ring-2 ring-blue-200" : "border-slate-200"
                }`}
              >
                <a href={photo.secureUrl} target="_blank" rel="noreferrer" title="Open the full picture">
                  <img
                    src={photo.secureUrl}
                    alt={photo.caption ?? facility.name}
                    className="h-28 w-full object-cover transition hover:opacity-90"
                  />
                </a>
                {(photo.isCover || photo.caption) && (
                  <div className="px-2.5 py-1.5">
                    {photo.isCover ? (
                      // Named, not merely outlined: which picture leads is the
                      // one thing this list has to answer.
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                        <StarOutlined sx={{ fontSize: 13 }} aria-hidden />
                        Primary
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">{photo.caption}</span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

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
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-[#071955]">Opening hours</h4>
          <EditButton label="opening hours" onClick={onEditHours} />
        </div>
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

      <CourtsPanel
        facilityId={facility.id}
        facilityName={facility.name}
        facilityOwnerId={facilityOwnerId}
      />

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

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ContractRow({
  contract,
  onCancel,
  onReplaceAgreement,
  onEditRates,
}: {
  contract: ContractDetail;
  onCancel: () => void;
  onReplaceAgreement: () => void;
  onEditRates: () => void;
}) {
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

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {contract.document ? (
          <>
            <a
              href={contract.document.secureUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#2563EB] transition hover:text-[#071955]"
            >
              <GavelOutlined sx={{ fontSize: 15 }} />
              {contract.document.fileName}
              <OpenInNewOutlined sx={{ fontSize: 13 }} />
            </a>
            <button
              type="button"
              onClick={onReplaceAgreement}
              className="text-sm font-bold text-slate-500 transition hover:text-[#071955]"
            >
              Replace
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <GavelOutlined sx={{ fontSize: 13 }} />
            No signed agreement
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-sm text-slate-600">
          <span className="font-bold text-[#071955]">
            {peso(contract.platformHourlyRate)}
          </span>{" "}
          an hour billed to the owner
          <span className="text-slate-400"> · </span>
          <span className="font-bold text-[#071955]">{contract.commissionPercentage}%</span> of that
          bill for maintenance
        </p>
        {!contract.cancelledAt && (
          <button
            type="button"
            onClick={onEditRates}
            className="text-sm font-bold text-[#164eaa] transition hover:text-[#071955]"
          >
            Change rates
          </button>
        )}
      </div>

      {!contract.cancelledAt && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-1.5 text-sm font-bold text-red-700 transition hover:text-red-900"
        >
          Cancel this term
        </button>
      )}
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

type OpenDialog = "business" | "facility" | "hours" | "renew" | null;

function AdminFacilityOwnerDetailView({ facilityOwnerId }: { facilityOwnerId: string }) {
  const owner = useAdminFacilityOwner(facilityOwnerId);
  const detail = owner.data;
  const facilityCount = detail?.facilities.length ?? 0;
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  // Cancelling ends a contract and can take a facility off the booking portal,
  // so it is confirmed rather than fired from the row it sits on.
  const [cancelling, setCancelling] = useState<ContractDetail | null>(null);
  const [replacingAgreement, setReplacingAgreement] = useState<ContractDetail | null>(null);
  const [editingRates, setEditingRates] = useState<ContractDetail | null>(null);

  // The facilities arrive with the query, not with the markup, so the browser
  // has nothing to scroll to when it first reads the hash. Doing it here is
  // what makes a link from the facility inventory land on its own venue.
  useEffect(() => {
    if (facilityCount === 0 || !window.location.hash.startsWith("#facility-")) {
      return;
    }

    document
      .getElementById(window.location.hash.slice(1))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [facilityCount]);

  // Read from the term in force, falling back to the newest one when none is
  // live: the badge should describe the contract the status came from.
  const currentContract =
    detail?.contracts.find((contract) => contract.isLiveToday) ?? detail?.contracts[0];
  const agreementOnFile = currentContract?.document != null;

  const editingFacility = detail?.facilities.find(
    (facility) => facility.id === editingFacilityId,
  );

  // The day after the last live term ends, so a renewal does not default to a
  // range the server will refuse as overlapping.
  const suggestedStart = (() => {
    const live = detail?.contracts.filter((contract) => !contract.cancelledAt) ?? [];
    if (live.length === 0) {
      return null;
    }

    const latest = live
      .map((contract) => contract.endDate)
      .sort()
      .at(-1)!;
    const next = new Date(latest);
    next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  })();

  function openFacilityDialog(facilityId: string, which: "facility" | "hours") {
    setEditingFacilityId(facilityId);
    setDialog(which);
  }

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
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {detail.businessName}
                  </h1>
              <span
                title={statusHints[detail.status]}
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[detail.status]}`}
              >
                {facilityOwnerStatusLabels[detail.status] ?? detail.status}
              </span>
              {/* Whether the paperwork matches the status. A commenced owner
                  with no agreement on file is the pairing worth spotting from
                  the top of the page. */}
              <span
                title={
                  agreementOnFile
                    ? "The signed agreement for the live term is attached."
                    : "No signed agreement is attached to the term in force."
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  agreementOnFile ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                  <GavelOutlined sx={{ fontSize: 13 }} />
                  {agreementOnFile ? "Agreement on file" : "No agreement"}
                </span>
                </div>
                <p className="mt-2 text-slate-500">{statusHints[detail.status]}</p>
              </div>

              {/* Beside the heading, not buried in a facility panel: an owner
                  with no facility yet has nowhere else to start from. */}
              <Link
                href={`/admin/facility-owners/${facilityOwnerId}/courts/new`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <AddOutlined sx={{ fontSize: 18 }} />
                {detail.facilities.length === 0
                  ? "Add the first facility and court"
                  : "Add a facility or court"}
              </Link>
            </div>

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

              <Section
                title="Business"
                action={<EditButton label="business details" onClick={() => setDialog("business")} />}
              >
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

              <Section
                title={`Contracts (${detail.contracts.length})`}
                action={
                  <button
                    type="button"
                    onClick={() => setDialog("renew")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#164eaa] transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <AddOutlined sx={{ fontSize: 15 }} />
                    Commence a term
                  </button>
                }
              >
                {detail.contracts.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No contract yet, so this owner is not bookable.
                  </p>
                ) : (
                  <ul>
                    {detail.contracts.map((contract) => (
                      <ContractRow
                        key={contract.id}
                        contract={contract}
                        onCancel={() => setCancelling(contract)}
                        onReplaceAgreement={() => setReplacingAgreement(contract)}
                        onEditRates={() => setEditingRates(contract)}
                      />
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
                      <FacilityPanel
key={facility.id}
                        facility={facility}
                        facilityOwnerId={facilityOwnerId}
                        onEditDetails={() => openFacilityDialog(facility.id, "facility")}
                        onEditHours={() => openFacilityDialog(facility.id, "hours")}
                      />
                    ))}
                  </div>
                )}
              </Section>
              <Section title="Activity">
                <ActivityTimeline facilityOwnerId={facilityOwnerId} />
              </Section>
            </div>

            <BusinessEditDialog
              detail={detail}
              open={dialog === "business"}
              onClose={() => setDialog(null)}
            />

            {editingRates && (
              <ContractRatesDialog
                key={editingRates.id}
                facilityOwnerId={facilityOwnerId}
                contract={editingRates}
                open
                onClose={() => setEditingRates(null)}
              />
            )}

            <ReplaceAgreementDialog
              facilityOwnerId={facilityOwnerId}
              contract={replacingAgreement}
              onClose={() => setReplacingAgreement(null)}
            />

            <CancelContractDialog
              facilityOwnerId={facilityOwnerId}
              contract={cancelling}
              isLastLiveTerm={
                detail.contracts.filter(
                  (contract) => !contract.cancelledAt && contract.isLiveToday,
                ).length <= 1
              }
              onClose={() => setCancelling(null)}
            />

            <RenewContractDialog
              facilityOwnerId={facilityOwnerId}
              suggestedStart={suggestedStart}
              open={dialog === "renew"}
              onClose={() => setDialog(null)}
            />

            {editingFacility && (
              <>
                {/* Keyed on the facility so reopening a dialog starts from what
                    is stored now, not from what was loaded the first time. */}
                <FacilityEditDialog
                  key={`facility-${editingFacility.id}-${editingFacility.updatedAt}`}
                  facilityOwnerId={facilityOwnerId}
                  facility={editingFacility}
                  open={dialog === "facility"}
                  onClose={() => setDialog(null)}
                />
                <HoursEditDialog
                  key={`hours-${editingFacility.id}-${editingFacility.updatedAt}`}
                  facilityOwnerId={facilityOwnerId}
                  facility={editingFacility}
                  open={dialog === "hours"}
                  onClose={() => setDialog(null)}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default AdminFacilityOwnerDetailView;
