"use client";

import { useState } from "react";
import Link from "next/link";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import { ApiError } from "@/services/api";
import type { CreatedCourt } from "@auth/courtApi";
import { useAdminFacilityOwner } from "@auth/hooks/useAdminFacilityOwner";
import { useCreateCourt } from "@auth/hooks/useCourts";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import CourtDetailsStep from "../courts/CourtDetailsStep";
import CourtFacilityStep from "../courts/CourtFacilityStep";
import CourtPhotosStep from "../courts/CourtPhotosStep";
import CourtReviewStep from "../courts/CourtReviewStep";
import CourtSpaceStep from "../courts/CourtSpaceStep";
import { createEmptyCourtDraft, toCourtPayload, type CourtDraft } from "../courts/courtDraft";
import {
  firstInvalidCourtStep,
  isCourtStepValid,
  validateCourtStep,
} from "../courts/courtValidation";

const stepNames = ["Facility", "Court", "Space", "Photos", "Review"];

function Stepper({
  current,
  furthestVisited,
  draft,
  onJump,
}: {
  current: number;
  furthestVisited: number;
  draft: CourtDraft;
  onJump: (step: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2">
      {stepNames.map((name, index) => {
        const done = index < furthestVisited && isCourtStepValid(index, draft);
        const active = index === current;
        const reachable = index <= furthestVisited;

        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => reachable && onJump(index)}
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                active
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : done
                    ? "border-green-200 bg-green-50 text-green-800 hover:border-green-300"
                    : reachable
                      ? "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      : "cursor-not-allowed border-slate-100 bg-white text-slate-300"
              }`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs ${
                  active ? "bg-white/25" : done ? "bg-green-200" : "bg-slate-100"
                }`}
              >
                {done ? <CheckOutlined sx={{ fontSize: 13 }} /> : index + 1}
              </span>
              {name}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function AdminAddCourtView({ facilityOwnerId = "" }: { facilityOwnerId?: string }) {
  const create = useCreateCourt();

  const [draft, setDraft] = useState<CourtDraft>(() => createEmptyCourtDraft(facilityOwnerId));
  // Either the route named the owner, or step one did.
  const owner = useAdminFacilityOwner(draft.facilityOwnerId);
  const ownerIsFixed = facilityOwnerId !== "";
  const [step, setStep] = useState(0);
  const [furthestVisited, setFurthestVisited] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [result, setResult] = useState<CreatedCourt | null>(null);

  const facilities = owner.data?.facilities ?? [];
  const errors = showErrors ? validateCourtStep(step, draft) : {};
  const isLastStep = step === stepNames.length - 1;

  function goTo(next: number) {
    setStep(next);
    setFurthestVisited((furthest) => Math.max(furthest, next));
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (!isCourtStepValid(step, draft)) {
      // Hidden until the first attempt to move on, so the form does not turn
      // red while it is still being filled in.
      setShowErrors(true);
      return;
    }

    goTo(step + 1);
  }

  async function handleSubmit() {
    const invalidStep = firstInvalidCourtStep(draft);
    if (invalidStep !== null) {
      setShowErrors(true);
      if (invalidStep !== step) {
        setStep(invalidStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    try {
      setResult(await create.mutateAsync(toCourtPayload(draft)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // The banner below shows it.
    }
  }

  const submitError = create.error
    ? create.error instanceof ApiError
      ? create.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Platform admin", href: "/admin" },
            { label: "Facility owners", href: "/admin/facility-owners" },
            ...(ownerIsFixed
              ? [
                  {
                    label: owner.data?.businessName ?? "Loading…",
                    href: `/admin/facility-owners/${facilityOwnerId}`,
                  },
                ]
              : [{ label: "Facility inventory", href: "/admin/facility-inventory" }]),
            { label: "Add a court" },
          ]}
        />

        {result ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <CheckCircleOutlined sx={{ fontSize: 44 }} className="text-green-600" />
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {draft.court.name} is added
            </h2>
            <p className="mt-2 text-slate-500">
              It sits under {result.facilityName}. Pricing comes later, so it is recorded but not
              yet bookable.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={
                  ownerIsFixed
                    ? `/admin/facility-owners/${facilityOwnerId}`
                    : "/admin/facility-inventory"
                }
                className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                {ownerIsFixed ? "Back to the owner" : "Back to the inventory"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  // Another court in the same facility is the common next step,
                  // so that choice is carried over rather than asked again.
                  const next = createEmptyCourtDraft(draft.facilityOwnerId);
                  setDraft({
                    ...next,
                    facilityChoice: "existing",
                    facilityId: result.facilityId,
                  });
                  setResult(null);
                  create.reset();
                  setStep(0);
                  setFurthestVisited(0);
                }}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50"
              >
                Add another court here
              </button>
            </div>
          </section>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Add a court
            </h1>
            <p className="mt-2 text-slate-500">
              Saved all at once. If you add a facility here, it is created together with the
              court or not at all.
            </p>

            <div className="mt-6">
              <Stepper
                current={step}
                furthestVisited={furthestVisited}
                draft={draft}
                onJump={goTo}
              />
            </div>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {ownerIsFixed && owner.isPending ? (
                <p className="text-slate-500">Loading…</p>
              ) : ownerIsFixed && owner.isError ? (
                <p className="font-semibold text-red-700">
                  We couldn&apos;t load this facility owner.
                </p>
              ) : step === 0 ? (
                <CourtFacilityStep
                  draft={draft}
                  errors={errors}
                  facilities={facilities}
                  ownerName={owner.data?.businessName ?? ""}
                  ownerIsFixed={ownerIsFixed}
                  onChange={setDraft}
                />
              ) : step === 1 ? (
                <CourtDetailsStep
                  draft={draft}
                  errors={errors}
                  onChange={(court) => setDraft((current) => ({ ...current, court }))}
                />
              ) : step === 2 ? (
                <CourtSpaceStep
                  draft={draft}
                  errors={errors}
                  onChange={(court) => setDraft((current) => ({ ...current, court }))}
                />
              ) : step === 3 ? (
                <CourtPhotosStep
                  draft={draft}
                  onCourtPhotosChange={(photos) =>
                    setDraft((current) => ({ ...current, court: { ...current.court, photos } }))
                  }
                  onFacilityPhotosChange={(photos) =>
                    setDraft((current) => ({ ...current, newFacilityPhotos: photos }))
                  }
                />
              ) : (
                <CourtReviewStep draft={draft} facilities={facilities} onEditStep={goTo} />
              )}
            </section>

            {submitError && (
              <p className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">
                {submitError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goTo(Math.max(0, step - 1))}
                disabled={step === 0}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={create.isPending}
                  className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                >
                  {create.isPending ? "Adding…" : "Add the court"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  Continue
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default AdminAddCourtView;
