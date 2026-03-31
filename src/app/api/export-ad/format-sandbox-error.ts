import { APIError } from "@vercel/sandbox";

/**
 * Surfaces Vercel Sandbox API errors (e.g. 400) with response body — the default
 * err.message is often only "Status code 400 is not ok".
 */
export function formatSandboxExportError(err: unknown): string {
  if (err instanceof APIError) {
    const parts: string[] = [err.message];
    if (err.json !== undefined) {
      try {
        parts.push(
          typeof err.json === "string"
            ? err.json
            : JSON.stringify(err.json),
        );
      } catch {
        parts.push(String(err.json));
      }
    } else if (err.text?.trim()) {
      parts.push(err.text.trim().slice(0, 1200));
    }
    return parts.join(" — ");
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function localSandboxHint(): string {
  return (
    " Local Sandbox needs Vercel API auth (separate from BLOB_READ_WRITE_TOKEN): run `npx vercel link`, then `npx vercel env pull` " +
    "so `.env.local` contains VERCEL_OIDC_TOKEN (and project linkage). Or deploy to Vercel and use a build with `npm run vercel:remotion-snapshot && npm run build`."
  );
}
