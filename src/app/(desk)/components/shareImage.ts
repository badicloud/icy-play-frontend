/**
 * The square share image of a session's results, drawn in the browser: the
 * open play's background (or the court-blue one), the photo, and who it is
 * of — the generic template the venue chose, at 1080 × 1080.
 */

export type ShareImageInput = {
  /** "BEST PLAYERS", "WINNING TEAM", "TODAY'S PLAYERS". */
  badge: string;
  title: string;
  venue: string;
  /** "Fri, Oct 16". */
  date: string;
  photoUrl: string;
  backgroundUrl: string | null;
  names: string[];
};

const size = 1080;
const pad = 72;

/** Loads an image the canvas may read back: Cloudinary serves its images to any origin. */
function load(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("An image could not be loaded."));
    image.src = url;
  });
}

/**
 * Draws the image to fill the box, cropping what overflows. Side to side it is
 * cropped evenly; top to bottom, focusY says how much of the crop comes off the
 * top — 0.5 evenly, lower to keep more of the top.
 */
function cover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  focusY = 0.5,
) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  context.drawImage(image, (image.width - sw) / 2, (image.height - sh) * focusY, sw, sh, x, y, w, h);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

/** The court-blue background with a spotlight and faint court lines, for an open play without its own. */
function courtBackground(context: CanvasRenderingContext2D) {
  const base = context.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, "#0C447C");
  base.addColorStop(1, "#042C53");
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  const light = context.createRadialGradient(size / 2, size * 0.38, 0, size / 2, size * 0.38, size * 0.6);
  light.addColorStop(0, "rgba(133, 183, 235, 0.5)");
  light.addColorStop(1, "rgba(133, 183, 235, 0)");
  context.fillStyle = light;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = "rgba(255, 255, 255, 0.09)";
  context.lineWidth = 6;
  context.beginPath();
  context.arc(size / 2, size / 2, 260, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(0, size / 2);
  context.lineTo(size, size / 2);
  context.stroke();
}

/** Where each chip goes, wrapped across the width; null when they take more than the rows allowed. */
function layout(context: CanvasRenderingContext2D, labels: string[], rows: number) {
  const placed: { label: string; x: number; row: number; width: number }[] = [];
  let x = pad;
  let row = 0;

  for (const label of labels) {
    const width = context.measureText(label).width + 40;

    if (x + width > size - pad) {
      row++;
      x = pad;
    }

    if (row >= rows) {
      return null;
    }

    placed.push({ label, x, row, width });
    x += width + 12;
  }

  return placed;
}

/** Name chips on at most two rows: as many names as fit, then "+N more" for the rest. */
function drawNames(context: CanvasRenderingContext2D, names: string[], top: number, font: string) {
  context.font = `600 26px ${font}`;
  const chipHeight = 48;
  let chips = layout(context, names, 2);

  for (let shown = names.length - 1; chips === null && shown >= 0; shown--) {
    chips = layout(context, [...names.slice(0, shown), `+${names.length - shown} more`], 2);
  }

  for (const chip of chips ?? []) {
    const y = top + chip.row * (chipHeight + 12);
    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    roundedRect(context, chip.x, y, chip.width, chipHeight, chipHeight / 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.fillText(chip.label, chip.x + 20, y + 33);
  }
}

/** Shortens text with an ellipsis until it fits the width. */
function fit(context: CanvasRenderingContext2D, text: string, width: number) {
  if (context.measureText(text).width <= width) {
    return text;
  }

  let cut = text;

  while (cut.length > 1 && context.measureText(`${cut}…`).width > width) {
    cut = cut.slice(0, -1);
  }

  return `${cut}…`;
}

export async function renderShareImage(input: ShareImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser cannot draw the image.");
  }

  const font = getComputedStyle(document.body).fontFamily || "Segoe UI, Arial, sans-serif";
  const [photo, background] = await Promise.all([
    load(input.photoUrl),
    input.backgroundUrl ? load(input.backgroundUrl).catch(() => null) : Promise.resolve(null),
  ]);

  if (background) {
    cover(context, background, 0, 0, size, size);
  } else {
    courtBackground(context);
  }

  // A shade from light at the top to deep at the bottom, so the white text reads on
  // any background. Black, so a venue's own colours stay their own.
  const shade = context.createLinearGradient(0, 0, 0, size);
  shade.addColorStop(0, "rgba(0, 0, 0, 0.15)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  context.fillStyle = shade;
  context.fillRect(0, 0, size, size);

  context.textBaseline = "alphabetic";
  context.fillStyle = "#ffffff";

  // Venue and date across the top.
  context.font = `600 24px ${font}`;
  context.letterSpacing = "3px";
  context.fillText(fit(context, input.venue.toUpperCase(), 640), pad, 88);
  const date = input.date.toUpperCase();
  context.fillText(date, size - pad - context.measureText(date).width, 88);
  context.letterSpacing = "0px";

  // The badge.
  context.font = `700 26px ${font}`;
  context.letterSpacing = "2px";
  const badgeWidth = context.measureText(input.badge).width + 52;
  context.fillStyle = "#EF9F27";
  roundedRect(context, pad, 128, badgeWidth, 52, 26);
  context.fill();
  context.fillStyle = "#412402";
  context.fillText(input.badge, pad + 26, 164);
  context.letterSpacing = "0px";

  // The title.
  context.fillStyle = "#ffffff";
  context.font = `700 60px ${font}`;
  context.fillText(fit(context, input.title, size - pad * 2), pad, 252);

  // The photo, framed.
  // As tall as the names and footer allow, so as little as possible is cropped.
  const photoTop = 280;
  const photoHeight = input.names.length > 0 ? 590 : 700;
  context.save();
  roundedRect(context, pad, photoTop, size - pad * 2, photoHeight, 20);
  context.clip();
  // Cropped from near the top, so it is feet that go rather than heads.
  cover(context, photo, pad, photoTop, size - pad * 2, photoHeight, 0.2);
  context.restore();
  context.strokeStyle = "rgba(255, 255, 255, 0.9)";
  context.lineWidth = 5;
  roundedRect(context, pad, photoTop, size - pad * 2, photoHeight, 20);
  context.stroke();

  if (input.names.length > 0) {
    drawNames(context, input.names, photoTop + photoHeight + 28, font);
  }

  // The footer.
  context.font = `500 22px ${font}`;
  context.globalAlpha = 0.8;
  context.fillStyle = "#ffffff";
  context.fillText("Booked on IcyPlay", pad, size - 40);
  context.globalAlpha = 1;

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The image could not be made."))), "image/png"),
  );
}

/**
 * A phone photo, made smaller before it is uploaded: at most 2048 pixels on
 * its long side, as a JPEG. Faster over a venue's connection, and well
 * inside the storage's size limit. Anything that cannot be read goes as it is.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  const longest = 2048;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));

    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
