"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useSnackbar } from "notistack";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import QrCode2Outlined from "@mui/icons-material/QrCode2Outlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import {
  createUploadSignature,
  paymentHoldLimits,
  type FacilityOwnerDetail,
} from "@auth/adminApi";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";
import { useUpdatePaymentDetails } from "@auth/hooks/useFacilityOwnerEdits";
import { TextField } from "../onboarding/FormControls";
import EditDialog from "./EditDialog";

/** A QR code is a small picture. Anything this size is not one. */
const maximumSizeInBytes = 5 * 1024 * 1024;

const imageTypes = ["image/jpeg", "image/png", "image/webp"];

type PaymentDetailsDialogProps = {
  owner: FacilityOwnerDetail;
  open: boolean;
  onClose: () => void;
};

/**
 * Where the venue is paid, and how long it holds a court while it waits.
 *
 * The two belong together because they are one decision: a venue that cannot be
 * paid should not be holding courts at all, and a venue that can decides for
 * itself how long it will wait.
 */
function PaymentDetailsDialog({ owner, open, onClose }: PaymentDetailsDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdatePaymentDetails(owner.id);

  const [number, setNumber] = useState(owner.gcashNumber ?? "");
  const [accountName, setAccountName] = useState(owner.gcashAccountName ?? "");
  const [qrCodeUrl, setQrCodeUrl] = useState(owner.gcashQrCodeUrl);
  const [minutes, setMinutes] = useState(String(owner.partialBookingExpiryMinutes));
  const [reason, setReason] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const hold = Number(minutes.trim() === "" ? Number.NaN : minutes);

  const holdError = Number.isNaN(hold)
    ? "Enter a number of minutes."
    : !Number.isInteger(hold)
      ? "Whole minutes only."
      : hold < paymentHoldLimits.minimumMinutes || hold > paymentHoldLimits.maximumMinutes
        ? `Between ${paymentHoldLimits.minimumMinutes} and ${paymentHoldLimits.maximumMinutes} minutes.`
        : undefined;

  // A number with nobody's name against it gives the customer nothing to check
  // the recipient against before the money leaves their account.
  const nameError =
    number.trim() !== "" && accountName.trim() === ""
      ? "Say whose GCash account this is."
      : undefined;

  const nothingToPayWith = number.trim() === "" && qrCodeUrl === null;

  async function handleFile(file: File) {
    setUploadError(null);

    // Checked here as well as on the server, so the admin is told before the
    // file spends a minute uploading rather than after.
    if (!imageTypes.includes(file.type)) {
      setUploadError("The QR code has to be a JPG, PNG or WebP picture.");

      return;
    }

    if (file.size > maximumSizeInBytes) {
      setUploadError("That picture is over 5 MB. A QR code should be far smaller.");

      return;
    }

    setUploading(true);

    try {
      const signature = await createUploadSignature("gcash-qr-code");
      const uploaded = await uploadToCloudinary(file, signature);
      setQrCodeUrl(uploaded.secureUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    try {
      await update.mutateAsync({
        gcashNumber: number.trim() === "" ? null : number.trim(),
        gcashAccountName: accountName.trim() === "" ? null : accountName.trim(),
        gcashQrCodeUrl: qrCodeUrl,
        partialBookingExpiryMinutes: hold,
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The payment details are saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Payment details"
      description="Where customers send the money, and how long a court waits for it."
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={!holdError && !nameError && !uploading}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="gcash-number"
          label="GCash number"
          value={number}
          onChange={setNumber}
          hint="The mobile number customers send to."
        />
        <TextField
          id="gcash-account-name"
          label="GCash account name"
          value={accountName}
          onChange={setAccountName}
          error={nameError}
          hint="Shown to the customer so they can check who they are paying."
        />
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-[#071955]">GCash QR code</p>
        <p className="mt-0.5 text-sm text-slate-500">
          A screenshot of the venue&apos;s QR code. Customers scan this instead of typing the
          number.
        </p>

        {qrCodeUrl === null ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-500 transition hover:border-slate-300 disabled:cursor-not-allowed"
          >
            <UploadFileOutlined fontSize="small" />
            {uploading ? "Uploading…" : "Upload a QR code"}
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Image
              src={qrCodeUrl}
              alt="GCash QR code"
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 rounded-xl object-contain"
            />
            <div className="flex flex-col items-start gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#071955]">
                <QrCode2Outlined fontSize="small" /> QR code set
              </span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setQrCodeUrl(null)}
                className="flex items-center gap-1 text-sm font-bold text-slate-500 underline-offset-4 hover:underline"
              >
                <DeleteOutlineOutlined fontSize="small" /> Remove
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept={imageTypes.join(",")}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (file) {
              void handleFile(file);
            }
          }}
        />

        {uploadError && <p className="mt-2 text-sm font-semibold text-red-600">{uploadError}</p>}
      </div>

      {nothingToPayWith && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          With neither a number nor a QR code, customers can hold this venue&apos;s courts but
          cannot pay for them.
        </p>
      )}

      <div className="mt-5">
        <TextField
          id="partial-booking-expiry"
          label="Hold a court for"
          required
          value={minutes}
          onChange={setMinutes}
          error={holdError}
          hint={`Minutes a booking waits to be paid for before the hours go back on sale. Standard is ${paymentHoldLimits.defaultMinutes}.`}
        />
        <p className="mt-2 text-sm text-slate-500">
          The clock stops the moment the customer uploads their receipt — somebody who has paid
          should not lose a court while the venue is asleep.
        </p>
      </div>
    </EditDialog>
  );
}

export default PaymentDetailsDialog;
