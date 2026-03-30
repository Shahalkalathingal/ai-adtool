import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
  uploadToVercelBlob,
} from "@remotion/vercel";
import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";
import { z } from "zod";
import { buildAdStudioInputProps } from "@/lib/remotion/build-ad-studio-input-props";
import type {
  ClipTimelineState,
  ProjectTimelineMeta,
  TrackTimelineState,
} from "@/lib/types/timeline";
import {
  bundleRemotionProject,
  formatSse,
  type ExportSseProgress,
} from "./helpers";
import { restoreSnapshot } from "./restore-snapshot";

export const maxDuration = 800;

const COMPOSITION_ID = "AdStudioExport";

const bodySchema = z.object({
  origin: z.string().min(1),
  durationInFrames: z.number().int().min(1).max(72000),
  fps: z.number().positive().max(120),
  project: z
    .object({
      name: z.string(),
      metadata: z.record(z.string(), z.unknown()),
      brandConfig: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
  tracks: z.array(z.unknown()),
  clipsById: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return new Response(
      JSON.stringify({
        message:
          'Missing BLOB_READ_WRITE_TOKEN. In Vercel: Storage → Blob → link store; add token to env. Locally: copy from the same store into .env.local.',
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid export payload",
        issues: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = parsed.data;
  const project = data.project as ProjectTimelineMeta;
  const tracks = data.tracks as TrackTimelineState[];
  const clipsById = data.clipsById as Record<string, ClipTimelineState>;

  const baseProps = buildAdStudioInputProps(
    data.origin,
    project,
    tracks,
    clipsById,
  );
  const inputProps = {
    ...baseProps,
    __compositionDurationInFrames: data.durationInFrames,
    __compositionFps: data.fps,
  };

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const send = async (message: ExportSseProgress) => {
    await writer.write(encoder.encode(formatSse(message)));
  };

  const runRender = async () => {
    await send({ type: "phase", phase: "Starting Vercel Sandbox…", progress: 0 });

    const sandbox = process.env.VERCEL
      ? await restoreSnapshot()
      : await createSandbox({
          onProgress: async ({ progress, message }) => {
            await send({
              type: "phase",
              phase: message,
              progress,
              subtitle: "Local dev: creating a full sandbox (slower than production).",
            });
          },
        });

    try {
      if (!process.env.VERCEL) {
        bundleRemotionProject();
        await addBundleToSandbox({ sandbox, bundleDir: ".remotion" });
      }

      const { sandboxFilePath, contentType } = await renderMediaOnVercel({
        sandbox,
        compositionId: COMPOSITION_ID,
        inputProps,
        videoBitrate: "8M",
        logLevel: "warn",
        onProgress: async (update) => {
          switch (update.stage) {
            case "opening-browser":
              await send({
                type: "phase",
                phase: "Opening browser…",
                progress: update.overallProgress,
              });
              break;
            case "selecting-composition":
              await send({
                type: "phase",
                phase: "Selecting composition…",
                progress: update.overallProgress,
              });
              break;
            case "render-progress":
              await send({
                type: "phase",
                phase: "Rendering video…",
                progress: update.overallProgress,
              });
              break;
            default:
              break;
          }
        },
      });

      await send({
        type: "phase",
        phase: "Uploading to Vercel Blob…",
        progress: 1,
      });

      const { url, size } = await uploadToVercelBlob({
        sandbox,
        sandboxFilePath,
        contentType,
        blobToken,
        access: "public",
      });

      await send({ type: "done", url, size });
    } catch (err) {
      console.error("[export-ad]", err);
      await send({
        type: "error",
        message: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      await sandbox.stop().catch(() => {});
      await writer.close();
    }
  };

  waitUntil(runRender());

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
