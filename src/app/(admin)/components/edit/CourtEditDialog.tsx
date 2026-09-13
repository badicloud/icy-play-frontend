"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import { surfaces, venueTypes, venueTypeHints, type Court } from "@auth/courtApi";
import { useSports } from "@auth/hooks/useSports";
import { useUpdateCourt } from "@auth/hooks/useCourts";
import PhotoUploader, { type DraftPhoto } from "../courts/PhotoUploader";
import SportDivisions from "../courts/SportDivisions";
import { dayNames } from "../onboarding/draft";
import { TextAreaField, TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

function trimmedOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The API wants seconds; the input gives "06:00". */
function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function toInputTime(value: string | null) {
  return value === null ? "" : value.slice(0, 5);
}

type DayHours = {
  dayOfWeek: number;
  closed: boolean;
  opensAt: string;
  closesAt: string;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="text-sm font-bold text-[#071955]">{title}</h3>
      {hint && <p className="mt-1 mb-3 text-sm text-slate-500">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

type CourtEditDialogProps = {
  court: Court;
  open: boolean;
  onClose: () => void;
};

/**
 * One dialog rather than a section each, because the API answers a court
 * whole: the sports, the hours and the gallery interlock, and saving them
 * separately would let a court sit in a state none of the three screens meant.
 */
function CourtEditDialog({ court, open, onClose }: CourtEditDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const sports = useSports();
  const update = useUpdateCourt(court.id);

  const [form, setForm] = useState({
    name: court.name,
    displayOrder: String(court.displayOrder),
    description: court.description ?? "",
    venueType: court.venueType,
    surface: court.surface ?? "",
    hasLighting: court.hasLighting,
    sizeLabel: court.sizeLabel ?? "",
    capacity: court.capacity === null ? "" : String(court.capacity),
    equipment: court.equipment ?? "",
    slotLengthMinutes: String(court.slotLengthMinutes),
    minimumDurationMinutes: String(court.minimumDurationMinutes),
    bufferMinutes: String(court.bufferMinutes),
    usesFacilityHours: court.usesFacilityHours,
    isActive: court.isActive,
  });

  const [sportIds, setSportIds] = useState(court.sports.map((sport) => sport.sportId));
  const [divisions, setDivisions] = useState<Record<string, number>>(() =>
    Object.fromEntries(court.sports.map((sport) => [sport.sportId, sport.divisions])),
  );
  const [primarySportId, setPrimarySportId] = useState(
    court.sports.find((sport) => sport.isPrimary)?.sportId ?? "",
  );
  const [photos, setPhotos] = useState<DraftPhoto[]>(() =>
    court.photos.map((photo) => ({
      publicId: photo.publicId,
      secureUrl: photo.secureUrl,
      caption: photo.caption ?? "",
      isCover: photo.isCover,
    })),
  );
  // Seeded from what the court shows today, which is the facility's schedule
  // when it follows one. Opting out starts from that rather than from blank.
  const [hours, setHours] = useState<DayHours[]>(() =>
    dayNames.map((_, dayOfWeek) => {
      const row = court.operatingHours.find((hour) => hour.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        closed: !row || row.opensAt === null,
        opensAt: toInputTime(row?.opensAt ?? null) || "06:00",
        closesAt: toInputTime(row?.closesAt ?? null) || "22:00",
      };
    }),
  );
  const [reason, setReason] = useState("");

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [field]: value }));

  function toggleSport(sportId: string) {
    const selected = sportIds.includes(sportId);
    const next = selected ? sportIds.filter((id) => id !== sportId) : [...sportIds, sportId];

    setSportIds(next);
    // The main sport has to stay one of the selected ones, so dropping it
    // moves the star rather than leaving it pointing at nothing.
    if (!next.includes(primarySportId)) {
      setPrimarySportId(next[0] ?? "");
    }
  }

  const slot = Number(form.slotLengthMinutes);
  const minimum = Number(form.minimumDurationMinutes);
  const buffer = Number(form.bufferMinutes);

  const slotError =
    form.slotLengthMinutes.trim() === "" || slot <= 0 ? "A slot has to be longer than zero." : undefined;
  const minimumError =
    minimum < slot
      ? "The minimum cannot be shorter than one slot."
      : slot > 0 && minimum % slot !== 0
        ? "The minimum has to be a whole number of slots."
        : undefined;

  const canSave =
    form.name.trim() !== "" &&
    sportIds.length > 0 &&
    primarySportId !== "" &&
    !slotError &&
    !minimumError &&
    buffer >= 0;

  const grouped = (sports.data ?? []).reduce<Record<string, typeof sports.data>>(
    (groups, sport) => {
      (groups[sport.category] ??= []).push(sport);
      return groups;
    },
    {},
  );

  async function handleSave() {
    try {
      await update.mutateAsync({
        court: {
          name: form.name.trim(),
          displayOrder: Number(form.displayOrder) || 0,
          description: trimmedOrNull(form.description),
          sports: sportIds.map((sportId) => ({
            sportId,
            divisions: divisions[sportId] ?? 1,
          })),
          primarySportId,
          venueType: form.venueType,
          surface: trimmedOrNull(form.surface),
          hasLighting: form.hasLighting,
          sizeLabel: trimmedOrNull(form.sizeLabel),
          capacity: form.capacity.trim() === "" ? null : Number(form.capacity),
          equipment: trimmedOrNull(form.equipment),
          slotLengthMinutes: slot,
          minimumDurationMinutes: minimum,
          bufferMinutes: buffer,
          usesFacilityHours: form.usesFacilityHours,
          operatingHours: form.usesFacilityHours
            ? []
            : hours.map((day) => ({
                dayOfWeek: day.dayOfWeek,
                opensAt: day.closed ? null : toApiTime(day.opensAt),
                closesAt: day.closed ? null : toApiTime(day.closesAt),
              })),
          // Position is the display order, so reordering later needs no field.
          photos: photos.map((photo, index) => ({
            publicId: photo.publicId,
            secureUrl: photo.secureUrl,
            caption: photo.caption.trim() === "" ? null : photo.caption.trim(),
            displayOrder: index,
            isCover: photo.isCover,
          })),
        },
        isActive: form.isActive,
        reason: trimmedOrNull(reason),
      });
      enqueueSnackbar("The court is saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Edit court"
      description="Everything about this court, saved in one go."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={canSave}
    >
      <Section title="The court">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="edit-court-name"
            label="Court name"
            required
            value={form.name}
            onChange={(value) => set("name", value)}
          />
          <TextField
            id="edit-court-order"
            label="Display order"
            value={form.displayOrder}
            onChange={(value) => set("displayOrder", value)}
            hint="1 shows first."
          />
          <div className="sm:col-span-2">
            <TextAreaField
              id="edit-court-description"
              label="Description"
              rows={2}
              value={form.description}
              onChange={(value) => set("description", value)}
            />
          </div>
        </div>
      </Section>

      <Section
        title="What this court can be booked for"
        hint="Every sport played on it and every event the floor is hired for. Each one gets its own price."
      >
        {sports.isPending ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <fieldset key={category}>
                <legend className="text-sm font-semibold text-slate-500">{category}</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(items ?? []).map((sport) => {
                    const selected = sportIds.includes(sport.id);
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSport(sport.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                          selected
                            ? "border-[#2563EB] bg-blue-50 text-[#1257d5]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {selected && <CheckOutlined sx={{ fontSize: 14 }} aria-hidden />}
                        {sport.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {sportIds.length === 0 && (
          <p className="mt-2 text-sm font-semibold text-red-700">
            A court that takes no sport cannot be booked.
          </p>
        )}
      </Section>

      {sportIds.length > 0 && (
        <Section title="Dividing the court" hint="">
          <SportDivisions
            courtName={form.name}
            sportIds={sportIds}
            primarySportId={primarySportId}
            divisions={divisions}
            sports={sports.data}
            onChange={setDivisions}
          />
        </Section>
      )}

      {sportIds.length > 0 && (
        <Section title="Main sport" hint="What the court is listed as when only one name fits.">
          <div className="flex flex-wrap gap-2">
            {sportIds.map((sportId) => {
              const sport = sports.data?.find((candidate) => candidate.id === sportId);
              const isPrimary = primarySportId === sportId;

              return (
                <button
                  key={sportId}
                  type="button"
                  aria-pressed={isPrimary}
                  onClick={() => setPrimarySportId(sportId)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                    isPrimary
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {isPrimary && <StarOutlined sx={{ fontSize: 14 }} aria-hidden />}
                  {sport?.name ?? "Unknown sport"}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="The space">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-court-venue" className="block text-sm font-bold text-[#071955]">
              Venue type
            </label>
            <select
              id="edit-court-venue"
              value={form.venueType}
              onChange={(event) => set("venueType", event.target.value)}
              className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            >
              {venueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-sm text-slate-500">{venueTypeHints[form.venueType]}</p>
          </div>

          <div>
            <label htmlFor="edit-court-surface" className="block text-sm font-bold text-[#071955]">
              Surface
            </label>
            <select
              id="edit-court-surface"
              value={form.surface}
              onChange={(event) => set("surface", event.target.value)}
              className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Not recorded</option>
              {surfaces.map((surface) => (
                <option key={surface} value={surface}>
                  {surface}
                </option>
              ))}
            </select>
          </div>

          <TextField
            id="edit-court-size"
            label="Size"
            value={form.sizeLabel}
            onChange={(value) => set("sizeLabel", value)}
            placeholder="Full court"
          />
          <TextField
            id="edit-court-capacity"
            label="Capacity"
            value={form.capacity}
            onChange={(value) => set("capacity", value)}
            hint="People."
          />
          <div className="sm:col-span-2">
            <TextField
              id="edit-court-equipment"
              label="Equipment provided"
              value={form.equipment}
              onChange={(value) => set("equipment", value)}
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-[#071955]">
          <input
            type="checkbox"
            checked={form.hasLighting}
            onChange={(event) => set("hasLighting", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
          />
          Lit for evening play
        </label>
      </Section>

      <Section title="Booking rules" hint="How the day is cut up when someone books this court.">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            id="edit-court-slot"
            label="Slot length"
            required
            value={form.slotLengthMinutes}
            onChange={(value) => set("slotLengthMinutes", value)}
            error={slotError}
            hint="Minutes."
          />
          <TextField
            id="edit-court-minimum"
            label="Minimum booking"
            required
            value={form.minimumDurationMinutes}
            onChange={(value) => set("minimumDurationMinutes", value)}
            error={minimumError}
            hint={
              slot > 0 && minimum % slot === 0
                ? `${minimum / slot} ${minimum / slot === 1 ? "slot" : "slots"}.`
                : "Minutes."
            }
          />
          <TextField
            id="edit-court-buffer"
            label="Buffer between bookings"
            value={form.bufferMinutes}
            onChange={(value) => set("bufferMinutes", value)}
            hint="Minutes. Leave at 0 for none."
          />
        </div>
      </Section>

      <Section title="Opening hours">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-[#071955]">
          <input
            type="checkbox"
            checked={form.usesFacilityHours}
            onChange={(event) => set("usesFacilityHours", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
          />
          Follow the facility&apos;s hours
        </label>

        {!form.usesFacilityHours && (
          <div className="mt-3 space-y-2">
            {hours.map((day) => (
              <div
                key={day.dayOfWeek}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <span className="w-24 text-sm font-bold text-[#071955]">
                  {dayNames[day.dayOfWeek]}
                </span>
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((row) =>
                          row.dayOfWeek === day.dayOfWeek
                            ? { ...row, closed: event.target.checked }
                            : row,
                        ),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                  />
                  Closed
                </label>
                {!day.closed && (
                  <>
                    <input
                      type="time"
                      aria-label={`${dayNames[day.dayOfWeek]} opens at`}
                      value={day.opensAt}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((row) =>
                            row.dayOfWeek === day.dayOfWeek
                              ? { ...row, opensAt: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-[#071955]"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      aria-label={`${dayNames[day.dayOfWeek]} closes at`}
                      value={day.closesAt}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((row) =>
                            row.dayOfWeek === day.dayOfWeek
                              ? { ...row, closesAt: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-[#071955]"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Photos">
        <PhotoUploader
          id="edit-court-photos"
          purpose="court-photo"
          photos={photos}
          onChange={setPhotos}
        />
      </Section>

      <Section
        title="Availability"
        hint="Taking a court off the portal is permanent until it is put back. Maintenance is the temporary one."
      >
        <label className="flex items-center gap-2.5 text-sm font-semibold text-[#071955]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
          />
          Customers can book this court
        </label>
      </Section>
    </EditDialog>
  );
}

export default CourtEditDialog;
