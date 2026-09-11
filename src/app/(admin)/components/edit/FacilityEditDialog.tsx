"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import type { FacilityDetail } from "@auth/adminApi";
import { useAmenities } from "@auth/hooks/useAmenities";
import { useUpdateFacility } from "@auth/hooks/useFacilityOwnerEdits";
import { parseCoordinates } from "../onboarding/draft";
import { TextAreaField, TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

const timeZones = ["Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong", "UTC"];

function trimmedOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

type FacilityEditDialogProps = {
  facilityOwnerId: string;
  facility: FacilityDetail;
  open: boolean;
  onClose: () => void;
};

function FacilityEditDialog({
  facilityOwnerId,
  facility,
  open,
  onClose,
}: FacilityEditDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateFacility(facilityOwnerId, facility.id);
  const amenities = useAmenities();

  const [form, setForm] = useState({
    name: facility.name,
    description: facility.description ?? "",
    addressLine1: facility.addressLine1,
    addressLine2: facility.addressLine2 ?? "",
    city: facility.city,
    province: facility.province,
    postalCode: facility.postalCode ?? "",
    country: facility.country,
    latitude: facility.latitude === null ? "" : String(facility.latitude),
    longitude: facility.longitude === null ? "" : String(facility.longitude),
    timeZone: facility.timeZone,
    contactPhone: facility.contactPhone ?? "",
    contactEmail: facility.contactEmail ?? "",
    safetyMeasures: facility.safetyMeasures ?? "",
    houseRules: facility.houseRules ?? "",
  });
  const [amenityIds, setAmenityIds] = useState(facility.amenities.map((amenity) => amenity.id));
  const [pasted, setPasted] = useState("");
  const [reason, setReason] = useState("");

  const set = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  function applyPastedLocation(text: string) {
    setPasted(text);
    const coordinates = parseCoordinates(text);
    if (coordinates) {
      setForm((current) => ({ ...current, ...coordinates }));
    }
  }

  const latitude = form.latitude.trim();
  const longitude = form.longitude.trim();
  const hasPin = latitude !== "" && longitude !== "";
  const halfAPin = (latitude === "") !== (longitude === "");

  const canSave =
    form.name.trim() !== "" &&
    form.addressLine1.trim() !== "" &&
    form.city.trim() !== "" &&
    form.province.trim() !== "" &&
    form.country.trim() !== "" &&
    !halfAPin;

  const grouped = (amenities.data ?? []).reduce<Record<string, typeof amenities.data>>(
    (groups, amenity) => {
      (groups[amenity.category] ??= []).push(amenity);
      return groups;
    },
    {},
  );

  async function handleSave() {
    try {
      await update.mutateAsync({
        name: form.name.trim(),
        description: trimmedOrNull(form.description),
        addressLine1: form.addressLine1.trim(),
        addressLine2: trimmedOrNull(form.addressLine2),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: trimmedOrNull(form.postalCode),
        country: form.country.trim(),
        latitude: hasPin ? Number(latitude) : null,
        longitude: hasPin ? Number(longitude) : null,
        timeZone: form.timeZone,
        contactPhone: trimmedOrNull(form.contactPhone),
        contactEmail: trimmedOrNull(form.contactEmail),
        safetyMeasures: trimmedOrNull(form.safetyMeasures),
        houseRules: trimmedOrNull(form.houseRules),
        amenityIds,
        reason: trimmedOrNull(reason),
      });
      enqueueSnackbar("The facility is saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Facility details"
      description="What customers see when they look this venue up."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={canSave}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="edit-facility-name"
            label="Facility name"
            required
            value={form.name}
            onChange={(value) => set("name", value)}
            hint={`The web address stays /${facility.slug}, so links already shared keep working.`}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            id="edit-facility-description"
            label="Description"
            rows={3}
            value={form.description}
            onChange={(value) => set("description", value)}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            id="edit-facility-address1"
            label="Street address"
            required
            value={form.addressLine1}
            onChange={(value) => set("addressLine1", value)}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            id="edit-facility-address2"
            label="Address line 2"
            value={form.addressLine2}
            onChange={(value) => set("addressLine2", value)}
          />
        </div>
        <TextField
          id="edit-facility-city"
          label="City"
          required
          value={form.city}
          onChange={(value) => set("city", value)}
        />
        <TextField
          id="edit-facility-province"
          label="Province"
          required
          value={form.province}
          onChange={(value) => set("province", value)}
        />
        <TextField
          id="edit-facility-postal"
          label="Postal code"
          value={form.postalCode}
          onChange={(value) => set("postalCode", value)}
        />
        <TextField
          id="edit-facility-country"
          label="Country"
          required
          value={form.country}
          onChange={(value) => set("country", value)}
        />

        <div>
          <label
            htmlFor="edit-facility-timezone"
            className="block text-sm font-bold text-[#071955]"
          >
            Time zone
            <span className="ml-1 font-bold text-red-600" aria-hidden>
              *
            </span>
          </label>
          <select
            id="edit-facility-timezone"
            value={form.timeZone}
            onChange={(event) => set("timeZone", event.target.value)}
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <TextField
          id="edit-facility-phone"
          label="Contact phone"
          type="tel"
          value={form.contactPhone}
          onChange={(value) => set("contactPhone", value)}
        />
        <TextField
          id="edit-facility-email"
          label="Contact email"
          type="email"
          value={form.contactEmail}
          onChange={(value) => set("contactEmail", value)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-bold text-[#071955]">Map location</h3>
        <TextField
          id="edit-facility-paste"
          label="Paste a Google Maps link or coordinates"
          value={pasted}
          onChange={applyPastedLocation}
          placeholder="7.073056, 125.612222"
        />
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField
            id="edit-facility-latitude"
            label="Latitude"
            value={form.latitude}
            onChange={(value) => set("latitude", value)}
            error={halfAPin && latitude === "" ? "A longitude needs a latitude." : undefined}
          />
          <TextField
            id="edit-facility-longitude"
            label="Longitude"
            value={form.longitude}
            onChange={(value) => set("longitude", value)}
            error={halfAPin && longitude === "" ? "A latitude needs a longitude." : undefined}
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-bold text-[#071955]">Amenities</h3>
        {amenities.isPending ? (
          <p className="text-sm text-slate-500">Loading amenities…</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <fieldset key={category}>
                <legend className="text-sm font-semibold text-slate-500">{category}</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(items ?? []).map((amenity) => {
                    const selected = amenityIds.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setAmenityIds((current) =>
                            selected
                              ? current.filter((id) => id !== amenity.id)
                              : [...current, amenity.id],
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                          selected
                            ? "border-[#2563EB] bg-blue-50 text-[#1257d5]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {selected && <CheckOutlined sx={{ fontSize: 14 }} aria-hidden />}
                        {amenity.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5">
        <TextAreaField
          id="edit-safety"
          label="Safety measures"
          rows={3}
          value={form.safetyMeasures}
          onChange={(value) => set("safetyMeasures", value)}
        />
        <TextAreaField
          id="edit-rules"
          label="House rules"
          rows={3}
          value={form.houseRules}
          onChange={(value) => set("houseRules", value)}
        />
      </div>
    </EditDialog>
  );
}

export default FacilityEditDialog;
