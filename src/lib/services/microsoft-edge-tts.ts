import { Buffer } from "node:buffer";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import WebSocket from "ws";

/** Mirrors rany2/edge-tts constants (Microsoft Edge online TTS). */
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".")[0] ?? "143";
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const BASE_PATH = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
const WSS_BASE = `wss://${BASE_PATH}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

function generateSecMsGec(): string {
  let ticks = Date.now() / 1000;
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const strToHash = `${Math.round(ticks)}${TRUSTED_CLIENT_TOKEN}`;
  return createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function connectId(): string {
  return randomUUID().replace(/-/g, "");
}

function generateMuid(): string {
  return randomBytes(16).toString("hex").toUpperCase();
}

/** Same as Python `time.strftime(..., time.gmtime())` in edge-tts communicate.py */
function dateToString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Remove chars the service rejects (from edge-tts communicate.py). */
function removeIncompatibleCharacters(text: string): string {
  return text.replace(/\u000b/g, "");
}

/**
 * Parse binary audio frames: legacy plain "Path:audio\r\n" or 2-byte BE header
 * length prefix + header lines (edge-tts communicate.py).
 */
function extractAudioPayload(buf: Buffer): Buffer | null {
  const legacySep = Buffer.from("Path:audio\r\n");
  const legacyIdx = buf.indexOf(legacySep);
  if (legacyIdx !== -1) {
    return buf.subarray(legacyIdx + legacySep.length);
  }
  if (buf.length < 4) return null;
  const headerLength = buf.readUInt16BE(0);
  if (headerLength < 4 || headerLength > buf.length) return null;
  const headerSlice = buf.subarray(0, headerLength);
  const lines = headerSlice.toString("latin1").split("\r\n");
  const params: Record<string, string> = {};
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    params[line.slice(0, colon)] = line.slice(colon + 1);
  }
  if (params.Path !== "audio") return null;
  // communicate.py: body at data[header_length + 2:]
  const bodyStart = headerLength + 2;
  if (bodyStart > buf.length) return null;
  return buf.subarray(bodyStart);
}

export type EdgeTtsOptions = {
  voice?: string;
  volume?: string;
  rate?: string;
  pitch?: string;
};

/**
 * Synthesize speech to MP3 (24kHz mono) using the same WebSocket + Sec-MS-GEC
 * flow as Python rany2/edge-tts (npm `edge-tts` is outdated and gets HTTP 403).
 */
export async function synthesizeMicrosoftEdgeTts(
  text: string,
  options: EdgeTtsOptions = {},
): Promise<Buffer> {
  const {
    voice = "en-US-GuyNeural",
    volume = "+0%",
    rate = "+0%",
    pitch = "+0Hz",
  } = options;

  const safeText = removeIncompatibleCharacters(text);
  const gec = generateSecMsGec();
  const cid = connectId();
  const wsUrl = `${WSS_BASE}&ConnectionId=${cid}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

  const audioChunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      host: "speech.platform.bing.com",
      perMessageDeflate: true,
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Sec-WebSocket-Version": "13",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: `muid=${generateMuid()};`,
      },
    });

    const fail = (err: Error) => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(err);
    };

    ws.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))));

    ws.on("message", (rawData: WebSocket.RawData, isBinary: boolean) => {
      const buf = Buffer.isBuffer(rawData)
        ? rawData
        : Buffer.from(rawData as ArrayBuffer);
      if (!isBinary) {
        const data2 = buf.toString("utf8");
        if (data2.includes("Path:turn.end") || data2.includes("turn.end")) {
          const out = Buffer.concat(audioChunks);
          if (out.length === 0) {
            fail(new Error("No audio received from Edge TTS."));
            return;
          }
          resolve(out);
          ws.close();
        }
        return;
      }
      const chunk = extractAudioPayload(buf);
      if (chunk && chunk.length > 0) {
        audioChunks.push(chunk);
      }
    });

    const speechConfig =
      '{"context":{"synthesis":{"audio":{"metadataoptions":{' +
      '"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"false"},' +
      '"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';

    ws.on("open", () => {
      const configMessage =
        `X-Timestamp:${dateToString()}\r\n` +
        "Content-Type:application/json; charset=utf-8\r\n" +
        "Path:speech.config\r\n\r\n" +
        speechConfig +
        "\r\n";

      ws.send(configMessage, { compress: true }, (configErr) => {
        if (configErr) {
          fail(configErr);
          return;
        }
        const requestId = connectId();
        const ts = `${dateToString()}Z`;
        const ssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
          `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
          `${escapeXml(safeText)}</prosody></voice></speak>`;
        const ssmlMessage =
          `X-RequestId:${requestId}\r\n` +
          "Content-Type:application/ssml+xml\r\n" +
          `X-Timestamp:${ts}\r\n` +
          "Path:ssml\r\n\r\n" +
          ssml;
        ws.send(ssmlMessage, { compress: true }, (ssmlErr) => {
          if (ssmlErr) fail(ssmlErr);
        });
      });
    });
  });
}
