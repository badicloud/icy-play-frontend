"use client";

import { useRef, useState } from "react";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { createUploadSignature, type UploadedFile } from "@auth/adminApi";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";

const maximumSizeInBytes = 50 * 1024 * 1024;

/**
 * PDF only. A photograph of a contract is not a record of one: a signature has
 * to stay legible at full page size, and a multi-page agreement cannot be a
 * single image anyway.
 */
const pdfContentType = "application/pdf";

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AgreementUploaderProps = {
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  /** Ids must differ when two uploaders can be on screen at once. */
  id?: string;
  error?: string;
};

/**
 * The signed agreement behind one contract term. A single file, unlike the
 * owner's verification documents: a term is one piece of paper, and an
 * amendment is a new term with its own.
 */
function AgreementUploader({ value, onChange, id = "agreement-file", error }: AgreementUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);

    // Checked here as well as on the server, so the admin is told before the
    // file spends a minute uploading rather than after.
    if (file.type !== pdfContentType) {
      setUploadError("The signed agreement must be a PDF.");
      return;
    }

    if (file.size > maximumSizeInBytes) {
      setUploadError(`${file.name} is ${formatFileSize(file.size)}, over the 50 MB limit.`);
      return;
    }

    setUploading(true);
    try {
      // Straight from this browser to Cloudinary; the API only signs it.
      const signature = await createUploadSignature("contract-document");
      onChange(await uploadToCloudinary(file, signature));
    } catch {
      setUploadError("The upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <DescriptionOutlined sx={{ fontSize: 20 }} className="shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-[#071955]">{value.fileName}</p>
            <p className="text-sm text-slate-500">{formatFileSize(value.sizeInBytes)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${value.fileName}`}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <DeleteOutlineOutlined sx={{ fontSize: 20 }} />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            disabled={uploading}
            id={id}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
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
            {uploading ? "Uploading…" : "Attach the signed agreement"}
          </label>
        </>
      )}

      <p className="mt-1.5 text-sm text-slate-500">
        A scan of the signed contract. PDF only, up to 50 MB.
      </p>

      {(uploadError || error) && (
        <p className="mt-1.5 text-sm font-semibold text-red-700">{uploadError ?? error}</p>
      )}
    </div>
  );
}

export default AgreementUploader;
