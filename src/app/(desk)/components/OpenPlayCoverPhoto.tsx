"use client";

import { useRef, useState } from "react";
import AddPhotoAlternateOutlined from "@mui/icons-material/AddPhotoAlternateOutlined";
import { ApiError } from "@/services/api";
import type { UploadedAsset } from "@auth/cloudinaryUpload";
import { coverPhotoMaxBytes, coverPhotoTypes } from "@auth/deskOpenPlayApi";

export type CoverPhoto = { publicId: string; secureUrl: string };

/**
 * The open play's one cover photo: pick, preview, change, remove.
 *
 * Uploads to Cloudinary the moment a file is picked, so the preview is the real
 * stored image rather than a local copy that might still fail. What happens
 * with the result is the page's call: on a saved open play it is recorded
 * straight away, on a new one it waits for the first save.
 *
 * Never disabled by the publishing lock. The photo is not part of what a
 * player signs up for, so it can change after publishing.
 */
function OpenPlayCoverPhoto({
  upload,
  url,
  busy,
  disabled = false,
  hint,
  onUploaded,
  onRemove,
}: {
  /** Puts the file into Cloudinary through the page's own door: the desk's or the admin's. */
  upload: (file: File) => Promise<UploadedAsset>;
  url: string | null;
  /** Saving the photo against the open play, after the upload itself. */
  busy: boolean;
  disabled?: boolean;
  hint: string;
  onUploaded: (photo: CoverPhoto) => void;
  onRemove: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!coverPhotoTypes.includes(file.type)) {
      setProblem("Use a JPG, PNG or WebP photo.");
      return;
    }

    if (file.size > coverPhotoMaxBytes) {
      setProblem("That photo is over 5 MB. Use a smaller one.");
      return;
    }

    setProblem(null);
    setUploading(true);

    try {
      const uploaded = await upload(file);
      onUploaded({ publicId: uploaded.publicId, secureUrl: uploaded.secureUrl });
    } catch (error) {
      setProblem(error instanceof ApiError || error instanceof Error ? error.message : "The photo could not be uploaded.");
    } finally {
      setUploading(false);

      // So picking the same file again after a failure still fires.
      if (picker.current) {
        picker.current.value = "";
      }
    }
  }

  const working = uploading || busy;

  return (
    <div>
      <input
        ref={picker}
        type="file"
        accept={coverPhotoTypes.join(",")}
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      {url ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Cover photo" className="h-56 w-full object-cover" />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || working}
          onClick={() => picker.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <AddPhotoAlternateOutlined />
          <span className="text-sm font-semibold">{working ? "Uploading…" : "Upload a cover photo"}</span>
          <span className="text-xs">JPG, PNG or WebP, up to 5 MB</span>
        </button>
      )}

      {url && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || working}
            onClick={() => picker.current?.click()}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            {working ? "Uploading…" : "Change photo"}
          </button>
          <button
            type="button"
            disabled={disabled || working}
            onClick={onRemove}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      )}

      {problem ? (
        <p className="mt-2 text-sm font-semibold text-red-700">{problem}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export default OpenPlayCoverPhoto;
