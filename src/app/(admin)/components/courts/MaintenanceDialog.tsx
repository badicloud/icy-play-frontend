"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { useSetMaintenance } from "@auth/hooks/useCourts";
import EditDialog from "../edit/EditDialog";
import { TextField } from "../onboarding/FormControls";

/** "2026-09-11T14:30" from the input, an instant for the API. */
function toInstant(localValue: string) {
  return new Date(localValue).toISOString();
}

function nowForInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export type MaintenanceTarget = {
  facilityId: string;
  /** Null closes the whole facility, and with it every court inside. */
  courtId: string | null;
  name: string;
  courtCount: number;
};

function MaintenanceDialog({
  target,
  onClose,
}: {
  target: MaintenanceTarget | null;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const setMaintenance = useSetMaintenance(target?.facilityId ?? "");

  const [startsAt, setStartsAt] = useState(nowForInput());
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");

  const wholeFacility = target?.courtId === null;
  const datesMakeSense = startsAt !== "" && (endsAt === "" || endsAt > startsAt);
  const canSave = datesMakeSense && reason.trim() !== "";

  async function handleSave() {
    if (!target) {
      return;
    }

    try {
      await setMaintenance.mutateAsync({
        courtId: target.courtId,
        payload: {
          startsAt: toInstant(startsAt),
          // Blank means until further notice, which is a real answer here.
          endsAt: endsAt === "" ? null : toInstant(endsAt),
          reason: reason.trim(),
        },
      });
      enqueueSnackbar(`${target.name} is marked under maintenance.`, { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title={wholeFacility ? "Close the whole facility" : "Close this court"}
      description={
        wholeFacility
          ? "Everything inside it reads as closed for the duration."
          : "Only this court. The rest of the facility carries on."
      }
      open={target !== null}
      isSaving={setMaintenance.isPending}
      error={setMaintenance.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={canSave}
      confirmLabel="Set maintenance"
      busyLabel="Saving…"
      destructive
      reasonRequired
      reasonLabel="Why is this closed?"
      reasonHint="Required. This is what the affected customers will be told."
    >
      {target && (
        <>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-[#071955]">{target.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {wholeFacility
                ? `${target.courtCount} ${target.courtCount === 1 ? "court" : "courts"} inside.`
                : "One court."}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="maintenance-start"
              label="From"
              required
              type="datetime-local"
              value={startsAt}
              onChange={setStartsAt}
            />
            <TextField
              id="maintenance-end"
              label="Until"
              type="datetime-local"
              value={endsAt}
              onChange={setEndsAt}
              error={
                endsAt !== "" && endsAt <= startsAt
                  ? "Maintenance cannot end before it starts."
                  : undefined
              }
              hint="Leave blank for until further notice."
            />
          </div>

          {wholeFacility && target.courtCount > 0 && (
            <p className="mt-5 flex gap-2.5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <WarningAmberOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
              <span>
                All {target.courtCount} courts here will read as closed, and none of them can be
                reopened on their own while this lasts.
              </span>
            </p>
          )}
        </>
      )}
    </EditDialog>
  );
}

export default MaintenanceDialog;
