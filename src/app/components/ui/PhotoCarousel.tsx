"use client";

import { useState } from "react";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";

export type CarouselPhoto = {
  id: string;
  secureUrl: string;
  caption: string | null;
  /** Which gallery it came from, so a viewer knows what they are looking at. */
  source: string;
};

/**
 * The venue's pictures, one at a time. A grid of twelve thumbnails shows
 * everything and lets the reader see nothing; a carousel gives each picture the
 * size it was uploaded for.
 */
function PhotoCarousel({ photos, alt }: { photos: CarouselPhoto[]; alt: string }) {
  const [at, setAt] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-[24px] border border-slate-200 bg-white text-slate-400 sm:h-96">
        No photos yet
      </div>
    );
  }

  const current = photos[Math.min(at, photos.length - 1)];

  function step(by: number) {
    // Wraps, so the last picture is one click from the first rather than a
    // dead end.
    setAt((index) => (index + by + photos.length) % photos.length);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900">
        <img
          src={current.secureUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl"
        />
        <img
          src={current.secureUrl}
          alt={current.caption ?? alt}
          className="relative h-72 w-full object-contain sm:h-96"
        />

        <span className="absolute left-4 top-4 rounded-lg bg-black/60 px-3 py-1.5 text-sm font-semibold text-white">
          {current.source}
        </span>

        {photos.length > 1 && (
          <>
            <span className="absolute right-4 top-4 rounded-lg bg-black/60 px-3 py-1.5 text-sm font-semibold text-white">
              {Math.min(at, photos.length - 1) + 1} / {photos.length}
            </span>

            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#071955] shadow-lg transition hover:bg-white"
            >
              <ChevronLeftOutlined />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#071955] shadow-lg transition hover:bg-white"
            >
              <ChevronRightOutlined />
            </button>
          </>
        )}

        {current.caption && (
          <p className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-3 text-sm text-white">
            {current.caption}
          </p>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setAt(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === at}
                className={`block overflow-hidden rounded-xl border-2 transition ${
                  index === at ? "border-[#2563EB]" : "border-transparent hover:border-slate-300"
                }`}
              >
                <img
                  src={photo.secureUrl}
                  alt=""
                  aria-hidden
                  className="h-16 w-24 object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PhotoCarousel;
