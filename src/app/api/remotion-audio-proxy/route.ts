import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h === "::1"
  ) {
    return true;
  }
  if (h === "metadata.google.internal" || h.endsWith(".internal")) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  const m172 = h.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (m172) {
    const n = Number(m172[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
    },
  });
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw?.trim()) {
    return NextResponse.json({ message: "Missing u query param" }, { status: 400 });
  }

  if (raw.includes("remotion-audio-proxy")) {
    return NextResponse.json({ message: "Invalid target" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ message: "Only http(s) URLs allowed" }, { status: 400 });
  }

  if (isBlockedHostname(target.hostname)) {
    return NextResponse.json({ message: "Host not allowed" }, { status: 403 });
  }

  const range = req.headers.get("range");
  const upstream = await fetch(target.toString(), {
    headers: {
      ...(range ? { Range: range } : {}),
      "User-Agent": "RemotionAudioProxy/1",
    },
  });

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Range");
  const ar = upstream.headers.get("Accept-Ranges");
  if (ar) headers.set("Accept-Ranges", ar);
  const ct = upstream.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);
  const cr = upstream.headers.get("Content-Range");
  if (cr) headers.set("Content-Range", cr);
  const cl = upstream.headers.get("Content-Length");
  if (cl) headers.set("Content-Length", cl);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
