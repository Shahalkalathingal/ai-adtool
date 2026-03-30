import { execSync } from "node:child_process";

export type ExportSseProgress =
  | { type: "phase"; phase: string; progress: number; subtitle?: string }
  | { type: "done"; url: string; size: number }
  | { type: "error"; message: string };

export function formatSse(message: ExportSseProgress): string {
  return `data: ${JSON.stringify(message)}\n\n`;
}

export function bundleRemotionProject(): void {
  try {
    execSync("npx remotion bundle src/remotion/entry.tsx --out-dir .remotion", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  } catch (e: unknown) {
    const stderr =
      e && typeof e === "object" && "stderr" in e
        ? String((e as { stderr?: Buffer }).stderr ?? "")
        : String(e);
    throw new Error(`Remotion bundle failed: ${stderr}`);
  }
}
