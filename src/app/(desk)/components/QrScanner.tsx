"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The same code read again inside this long is the same phone still held up,
 * not a second scan: it would only come back as "already used".
 */
const SameCodeQuietMs = 10_000;

/**
 * The phone's or tablet's camera, reading QR codes continuously: a code is
 * picked up the moment it is in view, with nothing to press.
 *
 * qr-scanner uses the browser's own barcode detector where there is one and a
 * web worker where there is not, several times a second. It is loaded only
 * when this mounts, so no other page carries it. The back camera where there
 * is one, because the desk points the device at a player's phone.
 *
 * While `paused` (a scan being checked, or its answer on screen) codes are
 * ignored but the camera keeps running, so the next player is read at once.
 * `children` are laid over the picture: the page's "Validating…" and answer.
 *
 * Browsers only open the camera on https or localhost; anywhere else this
 * says so rather than showing a black box.
 */
function QrScanner({
  onScan,
  paused,
  children,
}: {
  onScan: (text: string) => void;
  paused: boolean;
  children?: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  // Read from inside the scanner's callback, which is set up once and must
  // not restart the camera when they change.
  const handler = useRef(onScan);
  const held = useRef(paused);
  const last = useRef<{ text: string; at: number } | null>(null);

  useEffect(() => {
    handler.current = onScan;
    held.current = paused;
  }, [onScan, paused]);

  useEffect(() => {
    let scanner: { stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setProblem("The camera only works on a secure (https) address.");
        setStarting(false);
        return;
      }

      try {
        const { default: QrScannerLib } = await import("qr-scanner");

        if (cancelled || !video.current) {
          return;
        }

        const instance = new QrScannerLib(
          video.current,
          (result) => {
            if (held.current) {
              return;
            }

            const text = result.data;
            const now = Date.now();

            if (last.current && last.current.text === text && now - last.current.at < SameCodeQuietMs) {
              return;
            }

            last.current = { text, at: now };
            handler.current(text);
          },
          {
            preferredCamera: "environment",
            maxScansPerSecond: 10,
            returnDetailedScanResult: true,
            // Most of the picture, not just its middle: a phone held a little
            // off-centre is still read.
            calculateScanRegion: (element) => {
              const side = Math.round(Math.min(element.videoWidth, element.videoHeight) * 0.9);

              return {
                x: Math.round((element.videoWidth - side) / 2),
                y: Math.round((element.videoHeight - side) / 2),
                width: side,
                height: side,
                downScaledWidth: Math.min(side, 600),
                downScaledHeight: Math.min(side, 600),
              };
            },
          },
        );

        await instance.start();

        if (cancelled) {
          instance.destroy();
          return;
        }

        scanner = instance;
      } catch (error) {
        const text = String(error instanceof Error ? error.message : error);
        const denied = /denied|NotAllowed|permission/i.test(text);
        setProblem(
          denied
            ? "Camera access was refused. Allow the camera for this site in the browser's settings, then reload."
            : "The camera could not be started. Check that no other app is using it, then reload.",
        );
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900">
      <video ref={video} muted playsInline className="aspect-square w-full object-cover sm:aspect-video" />

      {/* Where to hold the QR. */}
      {!problem && !starting && !paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="aspect-square h-3/4 max-h-80 animate-pulse rounded-3xl border-4 border-white/80" />
        </div>
      )}

      {(starting || problem) && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="rounded-2xl bg-slate-900/80 px-4 py-3 text-sm font-semibold text-white">
            {problem ?? "Starting the camera…"}
          </p>
        </div>
      )}

      {!problem && children}
    </div>
  );
}

export default QrScanner;
