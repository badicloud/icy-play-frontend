"use client";

import { useRef, useState } from "react";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import StarBorderOutlined from "@mui/icons-material/StarBorderOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { createUploadSignature, type UploadPurpose } from "@auth/adminApi";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";

const maximumSizeInBytes = 10 * 1024 * 1024;

export type DraftPhoto = {
  publicId: string;
  secureUrl: string;
  caption: string;
  isCover: boolean;
};

type PhotoUploaderProps = {
  photos: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
  purpose: UploadPurpose;
  /** Ids must differ when two uploaders share a step. */
  id: string;
};

/**
 * A gallery with exactly one cover. The cover is what the booking portal and
 * the booking list show, so the first picture takes it automatically and the
 * admin only has to act when that guess is wrong.
 */
function PhotoUploader({ photos, onChange, purpose, id }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    const chosen = [...files];

    if (chosen.some((file) => !file.type.startsWith("image/"))) {
      setError("Photos have to be images.");
      return;
    }

    const tooBig = chosen.find((file) => file.size > maximumSizeInBytes);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 10 MB.`);
      return;
    }

    setUploading(true);
    try {
      // One signature per file. The files go from this browser straight to
      // Cloudinary; the API only signs them.
      const uploaded: DraftPhoto[] = [];
      for (const file of chosen) {
        const signature = await createUploadSignature(purpose);
        const asset = await uploadToCloudinary(file, signature);
        uploaded.push({
          publicId: asset.publicId,
          secureUrl: asset.secureUrl,
          caption: "",
          isCover: false,
        });
      }

      const combined = [...photos, ...uploaded];
      // Whatever happens, exactly one cover.
      onChange(
        combined.some((photo) => photo.isCover)
          ? combined
          : combined.map((photo, index) => ({ ...photo, isCover: index === 0 })),
      );
    } catch {
      setError("The upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  function remove(publicId: string) {
    const remaining = photos.filter((photo) => photo.publicId !== publicId);

    // Removing the cover promotes the next one rather than leaving the gallery
    // without one.
    onChange(
      remaining.length > 0 && !remaining.some((photo) => photo.isCover)
        ? remaining.map((photo, index) => ({ ...photo, isCover: index === 0 }))
        : remaining,
    );
  }

  function setCover(publicId: string) {
    onChange(photos.map((photo) => ({ ...photo, isCover: photo.publicId === publicId })));
  }

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        id={id}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void handleFiles(event.target.files);
          }
        }}
      />
      <label
        htmlFor={id}
        className={`inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-bold transition ${
          uploading
            ? "cursor-wait border-slate-200 bg-slate-50 text-slate-400"
            : "border-[#2563EB] bg-blue-50 text-[#1257d5] hover:bg-blue-100"
        }`}
      >
        <UploadFileOutlined sx={{ fontSize: 18 }} />
        {uploading ? "Uploading…" : photos.length === 0 ? "Add photos" : "Add more photos"}
      </label>

      <p className="mt-1.5 text-sm text-slate-500">
        Images up to 10 MB each. You can pick several at once.
      </p>

      {error && <p className="mt-1.5 text-sm font-semibold text-red-700">{error}</p>}

      {photos.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.publicId}
              className={`overflow-hidden rounded-2xl border bg-white ${
                photo.isCover ? "border-[#2563EB] ring-2 ring-blue-200" : "border-slate-200"
              }`}
            >
              <img
                src={photo.secureUrl}
                alt={photo.caption || "Uploaded photo"}
                className="h-32 w-full object-cover"
              />

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setCover(photo.publicId)}
                  aria-pressed={photo.isCover}
                  title={
                    photo.isCover
                      ? "This is what the booking list shows."
                      : "Make this the cover."
                  }
                  className={`inline-flex items-center gap-1 text-sm font-bold transition ${
                    photo.isCover
                      ? "text-amber-700"
                      : "text-slate-400 hover:text-amber-700"
                  }`}
                >
                  {photo.isCover ? (
                    <StarOutlined sx={{ fontSize: 16 }} />
                  ) : (
                    <StarBorderOutlined sx={{ fontSize: 16 }} />
                  )}
                  {photo.isCover ? "Cover" : "Set as cover"}
                </button>

                <button
                  type="button"
                  onClick={() => remove(photo.publicId)}
                  aria-label="Remove this photo"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <DeleteOutlineOutlined sx={{ fontSize: 18 }} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PhotoUploader;
