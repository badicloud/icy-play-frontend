"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useSnackbar } from "notistack";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import PersonRemoveOutlined from "@mui/icons-material/PersonRemoveOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import { ApiError } from "@/services/api";
import type { FacilityAttendantDetail } from "@auth/adminApi";
import {
  useFacilityAttendants,
  useRemoveAttendant,
  useResendAttendantInvitation,
} from "@auth/hooks/useFacilityOwnerEdits";
import InviteAttendantDialog from "../edit/InviteAttendantDialog";

/**
 * How many invitations have gone out, and when the last one went.
 *
 * An admin looking at somebody who has not started yet is deciding whether to
 * send another. "Invited" alone leaves them guessing whether anybody has
 * already tried, and how long ago.
 */
function invitationTrail(attendant: FacilityAttendantDetail) {
  const sent =
    attendant.invitationsSent > 1 ? ` · sent ${attendant.invitationsSent} times` : "";
  const when = attendant.lastInvitedAt
    ? ` · last ${format(new Date(attendant.lastInvitedAt), "d MMM yyyy")}`
    : "";

  return `${sent}${when}`;
}

/**
 * Who can confirm payments at one venue.
 *
 * The owner heads the list and has no remove button: they attend every venue
 * they own by owning it. A console that let somebody take the owner off their
 * own desk would be offering to lock them out of their own business.
 */
function AttendantsPanel({
  facilityOwnerId,
  facilityId,
  facilityName,
}: {
  facilityOwnerId: string;
  facilityId: string;
  facilityName: string;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const attendants = useFacilityAttendants(facilityOwnerId, facilityId);
  const remove = useRemoveAttendant(facilityOwnerId, facilityId);
  const resend = useResendAttendantInvitation(facilityOwnerId, facilityId);
  const [inviting, setInviting] = useState(false);

  function report(error: unknown) {
    enqueueSnackbar(
      error instanceof ApiError ? error.message : "That did not work. Please try again.",
      { variant: "error" },
    );
  }

  async function handleRemove(attendantId: string, name: string) {
    try {
      await remove.mutateAsync({ attendantId, reason: null });
      enqueueSnackbar(`${name} no longer works this venue.`, { variant: "success" });
    } catch (error) {
      report(error);
    }
  }

  async function handleResend(attendantId: string, email: string) {
    try {
      await resend.mutateAsync(attendantId);
      // The address, not the name: it is the address the letter went to, and
      // the address is what an admin checks when it does not arrive.
      enqueueSnackbar(`A new invitation is on its way to ${email}.`, { variant: "success" });
    } catch (error) {
      report(error);
    }
  }

  const staff = attendants.data?.filter((attendant) => !attendant.isOwner) ?? [];
  const busy = remove.isPending || resend.isPending;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#071955]">
          Court attendants{staff.length > 0 && ` (${staff.length})`}
        </h4>
        <button
          type="button"
          onClick={() => setInviting(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#164eaa] transition hover:border-slate-300 hover:bg-slate-50"
        >
          <AddOutlined sx={{ fontSize: 15 }} />
          Add attendant
        </button>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        They check GCash receipts and confirm bookings for this venue.
      </p>

      {attendants.isPending && <p className="mt-2 text-sm text-slate-400">Loading…</p>}

      {attendants.isError && (
        <p className="mt-2 text-sm text-red-600">Could not load who works this venue.</p>
      )}

      {attendants.data && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {attendants.data.map((attendant) => (
            <li
              key={attendant.userId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-[#071955]">
                  {attendant.fullName}
                  {attendant.isOwner && (
                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#2563EB]">
                      Owner
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">{attendant.email}</p>
              </div>

              <div className="flex items-center gap-4">
                {attendant.hasAccepted ? (
                  <span
                    title={
                      attendant.isOwner || attendant.wasInvited
                        ? undefined
                        : "This address already had an IcyPlay account, so no invitation was sent."
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700"
                  >
                    <CheckCircleOutlined sx={{ fontSize: 14 }} aria-hidden />
                    Active
                    {!attendant.isOwner && !attendant.wasInvited && (
                      <span className="font-semibold text-slate-400">· existing account</span>
                    )}
                  </span>
                ) : (
                  // Said plainly: an invited attendant who has not set a
                  // password cannot confirm anything yet, and an admin waiting
                  // for them to start should know why nothing is happening.
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <HourglassEmptyOutlined sx={{ fontSize: 14 }} aria-hidden />
                    Invited
                    <span className="font-semibold text-slate-400">
                      {invitationTrail(attendant)}
                    </span>
                  </span>
                )}

                {attendant.id !== null && !attendant.hasAccepted && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleResend(attendant.id!, attendant.email)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#164eaa] transition hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SendOutlined sx={{ fontSize: 15 }} />
                    Resend
                  </button>
                )}

                {attendant.id !== null && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemove(attendant.id!, attendant.fullName)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PersonRemoveOutlined sx={{ fontSize: 15 }} />
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {attendants.data && staff.length === 0 && (
        <p className="mt-2 text-sm text-slate-400">
          Only the owner can confirm bookings here so far.
        </p>
      )}

      <InviteAttendantDialog
        facilityOwnerId={facilityOwnerId}
        facilityId={facilityId}
        facilityName={facilityName}
        open={inviting}
        onClose={() => setInviting(false)}
      />
    </div>
  );
}

export default AttendantsPanel;
