"use client";

import { useState } from "react";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import { directionsUrl, parseCoordinates, type OnboardingDraft } from "../draft";
import type { FieldErrors } from "../validation";
import { RequiredMark, StepHeading, TextAreaField, TextField } from "../FormControls";

/** The zones a Philippine facility realistically sits in, plus room to grow. */
const timeZones = ["Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong", "UTC"];

type FacilityStepProps = {
  value: OnboardingDraft["facility"];
  errors: FieldErrors;
  onChange: (facility: OnboardingDraft["facility"]) => void;
};

function FacilityStep({ value, errors, onChange }: FacilityStepProps) {
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const set = (field: keyof OnboardingDraft["facility"], next: string) =>
    onChange({ ...value, [field]: next });

  function applyPastedLocation(text: string) {
    setPasted(text);
    setPasteError(null);

    if (text.trim() === "") {
      return;
    }

    const coordinates = parseCoordinates(text);
    if (!coordinates) {
      setPasteError("That does not look like a Google Maps link or a coordinate pair.");
      return;
    }

    onChange({ ...value, latitude: coordinates.latitude, longitude: coordinates.longitude });
  }

  const hasPin = value.latitude.trim() !== "" && value.longitude.trim() !== "";

  return (
    <div>
      <StepHeading
        title="The facility"
        description="The venue customers will book. Its address is what they search and travel to."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="facility-name"
            required
            label="Facility name"
            value={value.name}
            onChange={(next) => set("name", next)}
            error={errors.name}
            hint="Becomes the public web address, so make it the name customers would search."
          />
        </div>

        <div className="sm:col-span-2">
          <TextAreaField
            id="facility-description"
            label="Description"
            rows={3}
            value={value.description}
            onChange={(next) => set("description", next)}
            placeholder="Six covered badminton courts, air conditioned, parking for twenty."
          />
        </div>

        <div className="sm:col-span-2">
          <TextField
            id="facility-address1"
            required
            label="Street address"
            value={value.addressLine1}
            onChange={(next) => set("addressLine1", next)}
            error={errors.addressLine1}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            id="facility-address2"
            label="Address line 2"
            value={value.addressLine2}
            onChange={(next) => set("addressLine2", next)}
            placeholder="Building, floor, unit"
          />
        </div>

        <TextField
          id="facility-city"
          required
          label="City"
          value={value.city}
          onChange={(next) => set("city", next)}
          error={errors.city}
        />
        <TextField
          id="facility-province"
          required
          label="Province"
          value={value.province}
          onChange={(next) => set("province", next)}
          error={errors.province}
        />
        <TextField
          id="facility-postal"
          label="Postal code"
          value={value.postalCode}
          onChange={(next) => set("postalCode", next)}
        />
        <TextField
          id="facility-country"
          required
          label="Country"
          value={value.country}
          onChange={(next) => set("country", next)}
          error={errors.country}
        />

        <div>
          <label htmlFor="facility-timezone" className="block text-sm font-bold text-[#071955]">
            Time zone
            <RequiredMark />
          </label>
          <select
            id="facility-timezone"
            value={value.timeZone}
            required
            onChange={(event) => set("timeZone", event.target.value)}
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-slate-500">Opening hours are read in this zone.</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-[#071955]">Public contact</h3>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          What customers see. Deliberately separate from the billing contact.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="facility-phone"
            label="Contact phone"
            type="tel"
            value={value.contactPhone}
            onChange={(next) => set("contactPhone", next)}
          />
          <TextField
            id="facility-email"
            label="Contact email"
            type="email"
            value={value.contactEmail}
            onChange={(next) => set("contactEmail", next)}
            error={errors.contactEmail}
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#071955]">
          <PlaceOutlined sx={{ fontSize: 18 }} />
          Map location
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Optional, and addable later. Open Google Maps, right-click the venue, copy the
          coordinates, and paste them here. No account needed.
        </p>

        <div className="mt-4">
          <label htmlFor="facility-paste" className="block text-sm font-bold text-[#071955]">
            Paste a Google Maps link or coordinates
          </label>
          <input
            id="facility-paste"
            value={pasted}
            onChange={(event) => applyPastedLocation(event.target.value)}
            placeholder="7.073056, 125.612222"
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          />
          {pasteError && <p className="mt-1.5 text-sm font-semibold text-red-700">{pasteError}</p>}
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField
            id="facility-latitude"
            label="Latitude"
            value={value.latitude}
            onChange={(next) => set("latitude", next)}
            error={errors.latitude}
          />
          <TextField
            id="facility-longitude"
            label="Longitude"
            value={value.longitude}
            onChange={(next) => set("longitude", next)}
            error={errors.longitude}
          />
        </div>

        {hasPin && !errors.latitude && !errors.longitude && (
          <a
            href={directionsUrl(value.latitude.trim(), value.longitude.trim())}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] transition hover:text-[#071955]"
          >
            Check this pin on Google Maps
            <OpenInNewOutlined sx={{ fontSize: 15 }} />
          </a>
        )}
      </div>
    </div>
  );
}

export default FacilityStep;
