"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";
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

  const dir = path.join(process.cwd(), "public", "media", safeProject);
  await mkdir(dir, { recursive: true });
  const filename = `image-${safeClip}.${finalExt}`;
  const full = path.join(dir, filename);
  await writeFile(full, buf);

  return { ok: true, publicUrl: `/media/${safeProject}/${filename}` };
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

  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
  const finalExt = allowed.includes(ext) ? ext : "png";

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 6 * 1024 * 1024) {
    return { ok: false, error: "Logo must be 6MB or smaller." };
  }

  const dir = path.join(process.cwd(), "public", "media", safeProject);
  await mkdir(dir, { recursive: true });
  const filename = `brand-logo.${finalExt}`;
  const full = path.join(dir, filename);
  await writeFile(full, buf);

  return { ok: true, publicUrl: `/media/${safeProject}/${filename}` };
}
