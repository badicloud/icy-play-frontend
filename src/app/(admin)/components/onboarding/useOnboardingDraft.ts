"use client";

import { useEffect, useState } from "react";
import { createEmptyDraft, type OnboardingDraft } from "./draft";

const storageKey = "icyplay.admin.onboarding-draft";

/** What actually goes to localStorage: the answers, and where the admin was. */
type StoredDraft = {
  draft: OnboardingDraft;
  step: number;
  furthestVisited: number;
};

/**
 * The wizard keeps its draft in the browser rather than saving each step to the
 * server. The API writes the whole onboarding in one transaction, so nothing
 * half-built can be left in the database; this is only so closing the tab does
 * not throw away what has been typed.
 *
 * The step is saved with it. Coming back to step one after filling in five is
 * its own small punishment, and the answers alone do not say where the admin
 * had got to.
 *
 * Nothing secret goes in here: names, an address, and the public ids of files
 * already uploaded to Cloudinary.
 */
export function useOnboardingDraft(stepCount: number) {
  const [draft, setDraft] = useState<OnboardingDraft>(createEmptyDraft);
  const [step, setStep] = useState(0);
  const [furthestVisited, setFurthestVisited] = useState(0);
  const [restored, setRestored] = useState(false);
  const [hadSavedDraft, setHadSavedDraft] = useState(false);
  // Fixed at restore time: the banner reports where the draft was picked up,
  // which stops being true the moment the admin moves on.
  const [restoredStep, setRestoredStep] = useState(0);

  // Read on mount, not during render: localStorage does not exist on the
  // server, and reading it while rendering would mismatch the markup Next sent.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<StoredDraft> & Partial<OnboardingDraft>;

        // Drafts saved before the step was recorded are the bare draft object,
        // so they still open — just at step one, which is where they were.
        const savedDraft = (parsed.draft ?? parsed) as OnboardingDraft;

        // Spread over a fresh draft so a draft saved before a field existed
        // still opens, with the new field at its default.
        setDraft({ ...createEmptyDraft(), ...savedDraft });

        // Clamped rather than trusted: the stored number was written by an
        // older build that may have had more steps than this one has.
        const savedFurthest = clamp(parsed.furthestVisited ?? 0, stepCount);
        setFurthestVisited(savedFurthest);
        const openAt = Math.min(clamp(parsed.step ?? 0, stepCount), savedFurthest);
        setStep(openAt);
        setRestoredStep(openAt);
        setHadSavedDraft(true);
      }
    } catch {
      // A corrupt or blocked store is not worth failing the page over; the
      // admin simply starts from an empty wizard.
    }
    setRestored(true);
  }, [stepCount]);

  useEffect(() => {
    if (!restored) {
      return;
    }

    try {
      const payload: StoredDraft = { draft, step, furthestVisited };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Private browsing, or a full quota. Losing the draft on refresh is a
      // smaller problem than a wizard that will not accept typing.
    }
  }, [draft, step, furthestVisited, restored]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to do: the next save overwrites it anyway.
    }
    setDraft(createEmptyDraft());
    setStep(0);
    setFurthestVisited(0);
    setHadSavedDraft(false);
    setRestoredStep(0);
  }

  return {
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
  };
}

function clamp(value: number, stepCount: number) {
  return Number.isInteger(value) ? Math.min(Math.max(value, 0), stepCount - 1) : 0;
}
