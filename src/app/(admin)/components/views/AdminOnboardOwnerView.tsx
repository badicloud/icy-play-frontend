"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { ApiError } from "@/services/api";
import type { OnboardedFacilityOwner } from "@auth/adminApi";
import { useAmenities } from "@auth/hooks/useAmenities";
import { useOnboardFacilityOwner } from "@auth/hooks/useOnboardFacilityOwner";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { toPayload, type OnboardingDraft } from "../onboarding/draft";
import { useOnboardingDraft } from "../onboarding/useOnboardingDraft";
import { firstInvalidStep, isStepValid, validateStep } from "../onboarding/validation";
import OwnerStep from "../onboarding/steps/OwnerStep";
import BusinessStep from "../onboarding/steps/BusinessStep";
import FacilityStep from "../onboarding/steps/FacilityStep";
import AmenitiesStep from "../onboarding/steps/AmenitiesStep";
import HoursStep from "../onboarding/steps/HoursStep";
import ReviewStep from "../onboarding/steps/ReviewStep";

const stepNames = [
  "Owner",
  "Business",
  "Facility",
  "Amenities",
  "Hours",
  "Review",
];

function Stepper({
  current,
  furthestVisited,
  draft,
  onJump,
}: {
  current: number;
  furthestVisited: number;
  draft: OnboardingDraft;
  onJump: (step: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2">
      {stepNames.map((name, index) => {
        const done = index < furthestVisited && isStepValid(index, draft);
        const active = index === current;
        // Only steps already reached are clickable: jumping ahead would skip
        // the validation that keeps the server from rejecting the submit.
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

function SuccessPanel({
  result,
  onOnboardAnother,
}: {
  result: OnboardedFacilityOwner;
  onOnboardAnother: () => void;
}) {
  const commenced = result.status === "Commenced";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <CheckCircleOutlined sx={{ fontSize: 44 }} className="text-green-600" />
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        The facility owner is encoded
      </h2>

      <p className="mt-2 text-slate-500">
        {commenced
          ? "Their contract covers today, so they are live now."
          : "Their contract does not cover today, so they sit as Pending until it starts. No customer sees the facility until then."}
      </p>

      {!result.invitationEmailSent && (
        <p className="mt-4 flex gap-2.5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          <WarningAmberOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
          <span>
            The account was created, but the invitation email did not go out. The owner has no
            sign-in link yet. Ask them to use Forgot password, or try again once mail is working.
          </span>
        </p>
      )}

      <dl className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-slate-500">Status</dt>
          <dd className="font-bold text-[#071955]">{result.status}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-slate-500">Facility address</dt>
          <dd className="break-all font-bold text-[#071955]">/{result.facilitySlug}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/facility-owners"
          className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          Back to facility owners
        </Link>
        <button
          type="button"
          onClick={onOnboardAnother}
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50"
        >
          Onboard another
        </button>
      </div>
    </section>
  );
}

function AdminOnboardOwnerView() {
  const {
    draft,
    setDraft,
    step,
    setStep,
    furthestVisited,
    setFurthestVisited,
    clearDraft,
    restored,
    hadSavedDraft,
    restoredStep,
  } = useOnboardingDraft(stepNames.length);
  const [showErrors, setShowErrors] = useState(false);
  const [result, setResult] = useState<OnboardedFacilityOwner | null>(null);

  const amenities = useAmenities();
  const onboard = useOnboardFacilityOwner();

  const errors = showErrors ? validateStep(step, draft) : {};
  const isLastStep = step === stepNames.length - 1;

  const amenityNames = useMemo(
    () =>
      (amenities.data ?? [])
        .filter((amenity) => draft.amenityIds.includes(amenity.id))
        .map((amenity) => amenity.name),
    [amenities.data, draft.amenityIds],
  );

  function goTo(next: number) {
    setStep(next);
    setFurthestVisited((furthest) => Math.max(furthest, next));
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (!isStepValid(step, draft)) {
      // Errors stay hidden until the first attempt to move on, so a form does
      // not turn red while it is still being filled in.
      setShowErrors(true);
      return;
    }

    goTo(step + 1);
  }

  async function handleSubmit() {
    // The whole draft, not just the step on screen. A restored draft can open
    // on Review with an earlier step left invalid, and sending that to the
    // server only to have it rejected helps nobody.
    const invalidStep = firstInvalidStep(draft);
    if (invalidStep !== null) {
      setShowErrors(true);
      if (invalidStep !== step) {
        setStep(invalidStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    try {
      const onboarded = await onboard.mutateAsync(toPayload(draft));
      // Only now is the draft safe to drop: a failed submit must leave every
      // field exactly where the admin typed it.
      clearDraft();
      setResult(onboarded);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // The mutation already holds the error for the banner below. Swallowing
      // it here only stops it surfacing as an unhandled rejection.
    }
  }

  const submitError = onboard.error
    ? onboard.error instanceof ApiError
      ? onboard.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Platform admin", href: "/admin" },
            { label: "Facility owners", href: "/admin/facility-owners" },
            { label: "Onboard an owner" },
          ]}
        />

        {result ? (
          <div className="mt-6">
            <SuccessPanel
              result={result}
              onOnboardAnother={() => {
                setResult(null);
                onboard.reset();
                clearDraft();
              }}
            />
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Onboard a facility owner
            </h1>
            <p className="mt-2 text-slate-500">
              Everything is saved together at the end, so nothing half-built reaches the database.
              Your progress stays in this browser until you submit.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Fields marked <span className="font-bold text-red-600">*</span> are required.
              Everything else can be added later.
            </p>

            {hadSavedDraft && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-[#164eaa]">
                <span className="font-semibold">
                  We restored a draft you had started, at {stepNames[restoredStep]}.
                </span>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="font-bold underline underline-offset-2"
                >
                  Start over
                </button>
              </div>
            )}

            <div className="mt-6">
              <Stepper
                current={step}
                furthestVisited={furthestVisited}
                draft={draft}
                onJump={goTo}
              />
            </div>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {!restored ? (
                <p className="text-slate-500">Loading…</p>
              ) : step === 0 ? (
                <OwnerStep
                  value={draft.owner}
                  errors={errors}
                  onChange={(owner) => setDraft((current) => ({ ...current, owner }))}
                />
              ) : step === 1 ? (
                <BusinessStep
                  value={draft.business}
                  documents={draft.documents}
                  errors={errors}
                  onChange={(business) => setDraft((current) => ({ ...current, business }))}
                  onDocumentsChange={(documents) =>
                    setDraft((current) => ({ ...current, documents }))
                  }
                />
              ) : step === 2 ? (
                <FacilityStep
                  value={draft.facility}
                  errors={errors}
                  onChange={(facility) => setDraft((current) => ({ ...current, facility }))}
                  photos={draft.facilityPhotos}
                  onPhotosChange={(facilityPhotos) =>
                    setDraft((current) => ({ ...current, facilityPhotos }))
                  }
                />
              ) : step === 3 ? (
                <AmenitiesStep
                  selectedIds={draft.amenityIds}
                  safetyMeasures={draft.safetyMeasures}
                  houseRules={draft.houseRules}
                  onSelectionChange={(amenityIds) =>
                    setDraft((current) => ({ ...current, amenityIds }))
                  }
                  onTextChange={(field, value) =>
                    setDraft((current) => ({ ...current, [field]: value }))
                  }
                />
              ) : step === 4 ? (
                <HoursStep
                  value={draft.operatingHours}
                  errors={errors}
                  onChange={(operatingHours) =>
                    setDraft((current) => ({ ...current, operatingHours }))
                  }
                />
              ) : (
                <ReviewStep
                  draft={draft}
                  errors={errors}
                  amenityNames={amenityNames}
                  onContractChange={(contract) => setDraft((current) => ({ ...current, contract }))}
                  onEditStep={goTo}
                />
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
                  disabled={onboard.isPending}
                  className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                >
                  {onboard.isPending ? "Encoding…" : "Encode and commence"}
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

export default AdminOnboardOwnerView;
