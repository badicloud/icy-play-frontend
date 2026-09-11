"use client";

import { useRef, useState } from "react";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { createUploadSignature } from "@auth/adminApi";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";
import type { UploadedDocument } from "./draft";

/** Matches FacilityOwnerDocumentType on the server. */
export const documentTypes = [
  { value: "BusinessPermit", label: "Business permit" },
  { value: "GovernmentId", label: "Government ID" },
  { value: "DtiSecRegistration", label: "DTI or SEC registration" },
];

const maximumSizeInBytes = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DocumentUploaderProps = {
  documents: UploadedDocument[];
  onChange: (documents: UploadedDocument[]) => void;
  error?: string;
};

function DocumentUploader({ documents, onChange, error }: DocumentUploaderProps) {
  const [documentType, setDocumentType] = useState(documentTypes[0].value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);

    if (file.size > maximumSizeInBytes) {
      setUploadError(`${file.name} is larger than 10 MB.`);
      return;
    }

    setUploading(true);
    try {
      // The API only signs the upload. The file goes from this browser straight
      // to Cloudinary, so it never passes through our own server.
      const signature = await createUploadSignature("facility-owner-document");
      const asset = await uploadToCloudinary(file, signature);
      onChange([...documents, { documentType, ...asset }]);
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={documentType}
          onChange={(event) => setDocumentType(event.target.value)}
          aria-label="Document type"
          className="min-h-13 rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 sm:w-64"
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
          className="hidden"
          id="document-file"
        />
        <label
          htmlFor="document-file"
          className={`inline-flex min-h-13 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-bold transition ${
            uploading
              ? "cursor-wait border-slate-200 bg-slate-50 text-slate-400"
              : "border-[#2563EB] bg-blue-50 text-[#1257d5] hover:bg-blue-100"
          }`}
        >
          <UploadFileOutlined sx={{ fontSize: 18 }} />
          {uploading ? "Uploading…" : "Choose a file"}
        </label>
      </div>

      <p className="mt-1.5 text-sm text-slate-500">
        Images or PDF, up to 10 MB. Pick the type first, then the file.
      </p>

      {(uploadError || error) && (
        <p className="mt-2 text-sm font-semibold text-red-700">{uploadError ?? error}</p>
      )}

      {documents.length > 0 && (
        <ul className="mt-4 space-y-2">
          {documents.map((document, index) => (
            <li
              key={document.publicId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <DescriptionOutlined sx={{ fontSize: 20 }} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[#071955]">{document.fileName}</p>
                <p className="text-sm text-slate-500">
                  {documentTypes.find((type) => type.value === document.documentType)?.label ??
                    document.documentType}
                  {" · "}
                  {formatSize(document.sizeInBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange(documents.filter((_, at) => at !== index))}
                aria-label={`Remove ${document.fileName}`}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <DeleteOutlineOutlined sx={{ fontSize: 20 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DocumentUploader;
