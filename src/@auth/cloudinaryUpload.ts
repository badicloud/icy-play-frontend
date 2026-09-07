/** What the API returns from a signed-upload request. */
export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

export type UploadedAsset = {
  publicId: string;
  secureUrl: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
};

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  bytes?: number;
  error?: { message?: string };
};

/**
 * Uploads a file straight from the browser to Cloudinary using a signature the
 * API produced. The file never passes through our own server.
 *
 * Only `secure_url` is read back. Cloudinary also returns `url`, which is
 * http and would be blocked as mixed content once the site is on https.
 */
export async function uploadToCloudinary(
  file: File,
  signature: UploadSignature,
): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("folder", signature.folder);
  form.append("signature", signature.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`,
    { method: "POST", body: form },
  );

  const payload = (await response.json().catch(() => undefined)) as
    | CloudinaryUploadResponse
    | undefined;

  if (!response.ok || !payload?.public_id || !payload.secure_url) {
    throw new Error(
      payload?.error?.message ?? "The upload failed. Please try again.",
    );
  }

  return {
    publicId: payload.public_id,
    secureUrl: payload.secure_url,
    fileName: file.name,
    contentType: file.type,
    sizeInBytes: payload.bytes ?? file.size,
  };
}
