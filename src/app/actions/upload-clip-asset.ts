"use server";

import { savePublicMedia } from "@/lib/storage/public-media";

export type UploadClipAssetResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

export async function uploadClipImageAction(
  projectId: string,
  clipId: string,
  formData: FormData,
): Promise<UploadClipAssetResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file uploaded." };
  }

  const safeClip = clipId.replace(/[^a-zA-Z0-9_-]/g, "") || "clip";

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
  const finalExt = allowed.includes(ext) ? ext : "jpg";

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) {
    return { ok: false, error: "Image must be 12MB or smaller." };
  }

  const filename = `image-${safeClip}.${finalExt}`;
  const saved = await savePublicMedia({
    projectId,
    filename,
    buffer: buf,
    contentType:
      finalExt === "png"
        ? "image/png"
        : finalExt === "webp"
          ? "image/webp"
          : finalExt === "gif"
            ? "image/gif"
            : "image/jpeg",
  });
  if (!saved.ok) return saved;
  return { ok: true, publicUrl: saved.publicUrl };
}

/** Brand logo for Bottom Banner (stored next to other project media). */
export async function uploadBrandLogoAction(
  projectId: string,
  formData: FormData,
): Promise<UploadClipAssetResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file uploaded." };
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
  const finalExt = allowed.includes(ext) ? ext : "png";

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 6 * 1024 * 1024) {
    return { ok: false, error: "Logo must be 6MB or smaller." };
  }

  const filename = `brand-logo.${finalExt}`;
  const saved = await savePublicMedia({
    projectId,
    filename,
    buffer: buf,
    contentType:
      finalExt === "png"
        ? "image/png"
        : finalExt === "webp"
          ? "image/webp"
          : finalExt === "gif"
            ? "image/gif"
            : "image/jpeg",
  });
  if (!saved.ok) return saved;
  return { ok: true, publicUrl: saved.publicUrl };
}
