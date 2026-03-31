/**
 * Run during Vercel build: bakes the Remotion bundle into a sandbox snapshot in Blob.
 * Requires BLOB_READ_WRITE_TOKEN. See .env.example.
 *
 * Usage (from repo root): node -r dotenv/config scripts/create-remotion-snapshot.mjs
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addBundleToSandbox, createSandbox } from "@remotion/vercel";
import { put } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
process.chdir(root);

function bundleRemotion() {
  execSync("npx remotion bundle src/remotion/entry.tsx --out-dir .remotion", {
    cwd: root,
    stdio: "inherit",
  });
}

const getSnapshotBlobKey = () =>
  `snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}.json`;

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is required.");
    process.exit(1);
  }

  const sandbox = await createSandbox({
    onProgress: ({ progress, message }) => {
      console.log(
        `[create-remotion-snapshot] ${message} (${Math.round(progress * 100)}%)`,
      );
    },
  });

  try {
    console.log("[create-remotion-snapshot] Bundling Remotion…");
    bundleRemotion();
    console.log("[create-remotion-snapshot] Copying bundle into sandbox…");
    await sandbox.mkDir("remotion-bundle");
    await addBundleToSandbox({ sandbox, bundleDir: ".remotion" });
    console.log("[create-remotion-snapshot] Taking snapshot…");
    const snapshot = await sandbox.snapshot({ expiration: 0 });
    const { snapshotId } = snapshot;

    await put(getSnapshotBlobKey(), JSON.stringify({ snapshotId }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      token,
    });

    console.log(`[create-remotion-snapshot] Saved snapshot id: ${snapshotId}`);
  } finally {
    await sandbox.stop().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
