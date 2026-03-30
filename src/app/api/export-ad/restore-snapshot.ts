import { get } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";

const SANDBOX_CREATING_TIMEOUT = 5 * 60 * 1000;

const getSnapshotBlobKey = () =>
  `snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}.json`;

export async function restoreSnapshot() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  const fetched = await get(getSnapshotBlobKey(), {
    access: "public",
    token,
  });
  if (!fetched || fetched.statusCode !== 200 || !fetched.stream) {
    throw new Error(
      "No sandbox snapshot found. Run `npm run vercel:remotion-snapshot` during your build (see .env.example).",
    );
  }

  const response = new Response(fetched.stream);
  const cache: { snapshotId: string } = await response.json();
  const snapshotId = cache.snapshotId;

  if (!snapshotId) {
    throw new Error(
      "Invalid snapshot metadata. Run `npm run vercel:remotion-snapshot` again.",
    );
  }

  return Sandbox.create({
    source: { type: "snapshot", snapshotId },
    timeout: SANDBOX_CREATING_TIMEOUT,
  });
}
