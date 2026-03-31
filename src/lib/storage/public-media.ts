import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

type SavePublicMediaArgs = {
  projectId: string;
  filename: string;
  buffer: Buffer;
  contentType: string;
};

export type SavePublicMediaResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

export async function savePublicMedia({
  projectId,
  filename,
  buffer,
  contentType,
}: SavePublicMediaArgs): Promise<SavePublicMediaResult> {
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";

  if (process.env.VERCEL) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return {
        ok: false,
        error:
          "Missing BLOB_READ_WRITE_TOKEN. Link a Blob store in Vercel and add the token to this environment.",
      };
    }

    const key = `media/${safeProject}/${filename}`;
    const uploaded = await put(key, buffer, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType,
      token: blobToken,
    });
    return { ok: true, publicUrl: uploaded.url };
  }

  const dir = path.join(process.cwd(), "public", "media", safeProject);
  await mkdir(dir, { recursive: true });
  const full = path.join(dir, filename);
  await writeFile(full, buffer);
  return { ok: true, publicUrl: `/media/${safeProject}/${filename}` };
}
