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
    "@remotion/cli",
    "@remotion/vercel",
    "@vercel/blob",
    "@vercel/functions",
    "@vercel/sandbox",
    "esbuild",
  ],
  /**
   * Split giant dependency trees across routes so a single function stays under
   * Vercel’s 250MB unzipped limit. See: output file tracing in Next.js docs.
   */
  outputFileTracingExcludes: {
    "/api/export-ad": [
      "node_modules/@prisma/client/**/*",
      "node_modules/prisma/**/*",
      "node_modules/.prisma/**/*",
      "node_modules/@prisma/engines/**/*",
    ],
    "/api/remotion-audio-proxy": [
      "node_modules/@prisma/client/**/*",
      "node_modules/prisma/**/*",
      "node_modules/.prisma/**/*",
      "node_modules/@prisma/engines/**/*",
    ],
    "/studio": [
      "node_modules/@remotion/vercel/**/*",
      "node_modules/@remotion/cli/**/*",
      "node_modules/@vercel/sandbox/**/*",
    ],
    "/studio/[projectId]": [
      "node_modules/@remotion/vercel/**/*",
      "node_modules/@remotion/cli/**/*",
      "node_modules/@vercel/sandbox/**/*",
    ],
  },
};

export default nextConfig;
