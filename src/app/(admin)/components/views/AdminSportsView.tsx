"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { ApiError } from "@/services/api";
import { activityKindHints, activityKinds, sportCategories, type Sport } from "@auth/courtApi";
import { useCreateSport, useSetSportActive, useSports, useUpdateSport } from "@auth/hooks/useSports";
import AdminBreadcrumbs from "../AdminBreadcrumbs";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "../edit/EditDialog";

const selectClass =
  "min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200";

function SportDialog({
  sport,
  open,
  onClose,
}: {
  /** Null when adding rather than editing. */
  sport: Sport | null;
  open: boolean;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const create = useCreateSport();
  const update = useUpdateSport();
  const saving = create.isPending || update.isPending;

  const [name, setName] = useState(sport?.name ?? "");
  const [category, setCategory] = useState(sport?.category ?? sportCategories[0]);
  const [kind, setKind] = useState<string>(sport?.kind ?? "Sport");
  const [displayOrder, setDisplayOrder] = useState(String(sport?.displayOrder ?? 10));

  const order = Number(displayOrder);
  const canSave = name.trim() !== "" && Number.isInteger(order) && order >= 0;

  async function handleSave() {
    const payload = { name: name.trim(), category, displayOrder: order, kind };

    try {
      if (sport) {
        await update.mutateAsync({ id: sport.id, payload });
      } else {
        await create.mutateAsync(payload);
      }

      enqueueSnackbar(sport ? "The sport is saved." : "The sport is added.", {
        variant: "success",
      });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title={sport ? "Edit sport" : "Add a sport"}
      description="What courts can be listed as, and what customers filter on."
      open={open}
      isSaving={saving}
      error={create.error ?? update.error}
      // The lookup is small enough that a reason per edit would be noise.
      reason=""
      onReasonChange={() => {}}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={canSave}
      confirmLabel={sport ? "Save changes" : "Add the sport"}
      hideReason
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="sport-name"
            label="Name"
            required
            value={name}
            onChange={setName}
            hint={
              sport
                ? `The web address stays "${sport.key}", so a rename does not break a filter already shared.`
                : "The web address is built from this once, then stays put."
            }
          />
        </div>

        <div>
          <label htmlFor="sport-kind" className="block text-sm font-bold text-[#071955]">
            Is this a sport or an event?
          </label>
          <select
            id="sport-kind"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              // An event that sits under "Racket sports" would be filed where
              // nobody looks for it.
              if (event.target.value === "Event") {
                setCategory("Events");
              }
            }}
            className="mb-1.5 mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          >
            {activityKinds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mb-4 text-sm text-slate-500">{activityKindHints[kind]}</p>

          <label htmlFor="sport-category" className="block text-sm font-bold text-[#071955]">
            Category
            <span className="ml-1 font-bold text-red-600" aria-hidden>
              *
            </span>
          </label>
          <select
            id="sport-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={`mt-1.5 ${selectClass}`}
          >
            {sportCategories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <TextField
          id="sport-order"
          label="Display order"
          required
          value={displayOrder}
          onChange={setDisplayOrder}
          hint="Lower numbers come first inside the category."
        />
      </div>
    </EditDialog>
  );
}

function AdminSportsView() {
  const { enqueueSnackbar } = useSnackbar();
  const [includeRetired, setIncludeRetired] = useState(false);
  const [editing, setEditing] = useState<Sport | null>(null);
  const [adding, setAdding] = useState(false);

  const sports = useSports(includeRetired);
  const setActive = useSetSportActive();

  const grouped = (sports.data ?? []).reduce<Record<string, Sport[]>>((groups, sport) => {
    (groups[sport.category] ??= []).push(sport);
    return groups;
  }, {});

  async function toggle(sport: Sport) {
    try {
      await setActive.mutateAsync({ id: sport.id, isActive: !sport.isActive });
      enqueueSnackbar(sport.isActive ? `${sport.name} is retired.` : `${sport.name} is back.`, {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <AdminBreadcrumbs
          trail={[{ label: "Platform admin", href: "/admin" }, { label: "Sports" }]}
        />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Sports and events
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              What a court can be booked for — the games played on it, and the occasions
              the floor is hired for. Seeded with the common ones, and yours to extend.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <AddOutlined sx={{ fontSize: 18 }} />
            Add a sport or event
          </button>
        </div>

        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={includeRetired}
            onChange={(event) => setIncludeRetired(event.target.checked)}
            className="size-4 rounded border-slate-300 text-[#2563EB]"
          />
          Show retired entries
        </label>

        {sports.isError ? (
          <p className="mt-6 font-semibold text-red-700">
            We couldn&apos;t load the list. Please refresh the page.
          </p>
        ) : sports.isPending ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <div className="mt-6 space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <section
                key={category}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
                  {category}
                </h2>

                <ul>
                  {items.map((sport) => (
                    <li
                      key={sport.id}
                      className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-[#071955]">
                          {sport.name}
                          {!sport.isActive && (
                            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                              Retired
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500">
                          {sport.key} &middot;{" "}
                          {sport.courtCount === 0
                            ? "No courts yet"
                            : `${sport.courtCount} ${sport.courtCount === 1 ? "court" : "courts"}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditing(sport)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-[#2563EB] transition hover:bg-blue-50"
                      >
                        <EditOutlined sx={{ fontSize: 15 }} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggle(sport)}
                        disabled={setActive.isPending}
                        title={
                          sport.isActive
                            ? "Retired sports stay on the courts that list them; they just stop being offered."
                            : undefined
                        }
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:cursor-wait disabled:text-slate-400 ${
                          sport.isActive
                            ? "text-slate-500 hover:bg-slate-100 hover:text-[#071955]"
                            : "text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {sport.isActive ? "Retire" : "Reinstate"}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-5 text-sm text-slate-500">
          Retiring a sport never deletes it. Courts that list it keep their record; the sport
          simply stops being offered on new ones.
        </p>

        {adding && <SportDialog sport={null} open onClose={() => setAdding(false)} />}
        {editing && (
          <SportDialog
            key={editing.id}
            sport={editing}
            open
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </main>
  );
}

export default AdminSportsView;
