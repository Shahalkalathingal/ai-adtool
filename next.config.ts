import type { NextConfig } from "next";

/**
 * Optional: set `NEXT_DIST_DIR` in `.env.local` to a **relative** folder name
 * (e.g. `.next-local`) if `.next` under OneDrive/cloud sync causes ENOENT/locks.
 * Use a path under the repo so Next resolves it correctly on Windows.
 */
const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR?.trim()
    ? { distDir: process.env.NEXT_DIST_DIR.trim() }
    : {}),
  transpilePackages: ["remotion", "@remotion/player", "@remotion/media"],
  serverExternalPackages: [
    "kokoro-js",
    "@huggingface/transformers",
    "onnxruntime-node",
    "@remotion/cli",
    "@remotion/vercel",
    "@vercel/blob",
    "@vercel/functions",
    "@vercel/sandbox",
    "esbuild",
  ],
};

export default nextConfig;
