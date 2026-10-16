"use client";

import { useEffect, useState } from "react";
import { renderShareImage, type ShareImageInput } from "./shareImage";

type Props = {
  /** What to draw; null when the dialog is closed. */
  input: ShareImageInput | null;
  /** The file name to save it under, without ".png". */
  fileName: string;
  onClose: () => void;
};

/**
 * The share image, drawn in the browser from the photo and the open play's
 * background: a preview, then Download — and Share on a phone that can.
 */
function ShareImageDialog({ input, fileName, onClose }: Props) {
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (input === null) {
      return;
    }

    let gone = false;
    let made: string | null = null;
    setImage(null);
    setProblem(null);

    renderShareImage(input)
      .then((blob) => {
        if (gone) return;
        made = URL.createObjectURL(blob);
        setImage({ blob, url: made });
      })
      .catch((error: unknown) => {
        if (!gone) setProblem(error instanceof Error ? error.message : "The image could not be made.");
      });

    return () => {
      gone = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [input]);

  if (input === null) {
    return null;
  }

  const file = image ? new File([image.blob], `${fileName}.png`, { type: "image/png" }) : null;
  const canShare =
    file !== null && typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare({ files: [file] });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="flex max-h-full w-full max-w-lg flex-col rounded-3xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-extrabold text-[#071955]">Share image</h2>
        <p className="mt-1 text-sm text-slate-500">Square, ready for Facebook, Instagram or a group chat.</p>

        <div className="mt-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {image ? (
            // A blob URL made here: next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt="The share image" className="h-full w-full object-contain" />
          ) : problem ? (
            <p className="px-6 text-center text-sm font-semibold text-red-700">{problem}</p>
          ) : (
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#2563EB]" aria-label="Making the image" />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600">
            Close
          </button>
          {canShare && file && (
            <button
              type="button"
              onClick={() => navigator.share({ files: [file] }).catch(() => undefined)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              Share
            </button>
          )}
          {image && (
            <a
              href={image.url}
              download={`${fileName}.png`}
              className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareImageDialog;
