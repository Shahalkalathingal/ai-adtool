"use server";

import { savePublicMedia } from "@/lib/storage/public-media";

export type UploadClipAssetResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

function isValidProjectId(projectId: string): boolean {
  return /^[a-zA-Z0-9_-]{6,80}$/.test(projectId);
}

function makeUniqueFilename(prefix: string, ext: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}.${ext}`;
}

export async function uploadClipImageAction(
  projectId: string,
  clipId: string,
  formData: FormData,
): Promise<UploadClipAssetResult> {
  if (!isValidProjectId(projectId)) {
    return { ok: false, error: "Invalid project id." };
  }
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

  const filename = makeUniqueFilename(`image-${safeClip}`, finalExt);
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
  if (!isValidProjectId(projectId)) {
    return { ok: false, error: "Invalid project id." };
  }
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

  const filename = makeUniqueFilename("brand-logo", finalExt);
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
