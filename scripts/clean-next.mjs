/**
 * Best-effort removal of Next output dirs. Does not throw (OneDrive / locks
 * can make deletion fail — close other `next dev` terminals first).
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const toRemove = [join(cwd, ".next")];

const extra = process.env.NEXT_DIST_DIR?.trim();
if (
  extra &&
  !extra.includes("..") &&
  !/^[/\\]/.test(extra) &&
  !/^[a-zA-Z]:/.test(extra)
) {
  toRemove.push(join(cwd, extra));
}

for (const dir of toRemove) {
  if (!existsSync(dir)) continue;
  try {
    rmSync(dir, { recursive: true, force: true });
    console.log("[clean-next] removed", dir);
  } catch (e) {
    console.warn(
      "[clean-next] could not remove (close dev server / check OneDrive locks):",
      dir,
      e instanceof Error ? e.message : e,
    );
  }
}
