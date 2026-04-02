/* Vibe Studio Landing (Route 1) */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import {
  buildStudioEditorPath,
  makeProjectId,
  useStudioEntranceStore,
} from "@/lib/stores/studio-entrance-store";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: unknown;
  }
}

function isValidHttpUrl(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-places='true']",
    );
    if (existing) {
      window.setTimeout(() => resolve(), 250);
      return;
    }

    const script = document.createElement("script");
    script.dataset.googlePlaces = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Places script."));
    document.head.appendChild(script);
  });
}

type Prediction = {
  place_id: string;
  description: string;
};

type GoogleMapsLike = {
  maps?: {
    places?: {
      AutocompleteService?: new () => {
        getPlacePredictions: (
          req: { input: string },
          cb: (res: unknown[] | null) => void,
        ) => void;
      };
      PlacesService?: new (el: HTMLElement) => {
        getDetails: (
          req: { placeId: string; fields: string[] },
          cb: (d: unknown, status: string) => void,
        ) => void;
      };
    };
  };
};

export default function StudioLandingPage() {
  const router = useRouter();
  const seedEntrance = useStudioEntranceStore((s) => s.seedEntrance);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [googleReady, setGoogleReady] = useState(false);

  const [value, setValue] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notValidUrlText, setNotValidUrlText] = useState<string | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);

  const debounceRef = useRef<number | null>(null);

  const trimmed = value.trim();
  const validUrl = useMemo(() => isValidHttpUrl(trimmed), [trimmed]);

  useEffect(() => {
    if (!googleKey.trim()) return;
    void loadGooglePlacesScript(googleKey)
      .then(() => setGoogleReady(true))
      .catch(() => {
        setGoogleReady(false);
        toast.error("Google Places failed to load. Add a valid API key.");
      });
  }, [googleKey]);

  useEffect(() => {
    const v = trimmed;
    if (!v || validUrl) {
      setPredictions([]);
      setShowSuggestions(false);
      setNotValidUrlText(null);
      return;
    }

    setNotValidUrlText(v);

    if (!googleReady) return;
    const google = window.google as GoogleMapsLike | undefined;
    const places = google?.maps?.places;
    const AutocompleteService = places?.AutocompleteService;
    if (!AutocompleteService) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const svc = new AutocompleteService();
      svc.getPlacePredictions({ input: v }, (res) => {
        const out: Prediction[] = (Array.isArray(res) ? res : [])
          .map((r) => r as Record<string, unknown>)
          .map((r) => {
            const place_id = typeof r.place_id === "string" ? r.place_id : null;
            const description =
              typeof r.description === "string" ? r.description : null;
            if (!place_id || !description) return null;
            return { place_id, description };
          })
          .filter((x): x is Prediction => x !== null);

        setPredictions(out.slice(0, 8));
        setShowSuggestions(out.length > 0);
      });
    }, 180);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [trimmed, validUrl, googleReady]);

  const resolveLaunchUrl = async (): Promise<string | null> => {
    if (validUrl) return trimmed;
    if (!selectedPlaceId) return null;
    if (!googleReady) return null;
    const google = window.google as GoogleMapsLike | undefined;
    const places = google?.maps?.places;
    if (!places?.PlacesService) return null;

    const detailsSvc = new places.PlacesService(document.createElement("div"));

    const details = await new Promise<unknown | null>((resolve) => {
      detailsSvc.getDetails(
        {
          placeId: selectedPlaceId,
          fields: [
            "website",
            "url",
            "formatted_address",
            "formatted_phone_number",
            "name",
          ],
        },
        (d: unknown, status: string) => {
          resolve(status === "OK" ? (d ?? null) : null);
        },
      );
    });

    const record = typeof details === "object" && details ? (details as Record<string, unknown>) : null;
    const website = record && typeof record.website === "string" ? record.website : null;
    const url = record && typeof record.url === "string" ? record.url : null;
    const site = website ?? url;
    if (site && isValidHttpUrl(site)) return site.trim();
    return null;
  };

  const onLaunch = async () => {
    if (launchBusy) return;
    flushSync(() => {
      setLaunchBusy(true);
    });
    try {
      const launchUrl = await resolveLaunchUrl();
      if (!launchUrl) {
        if (!validUrl && !selectedPlaceId) {
          toast.error("Pick a Google Maps suggestion or enter a valid URL.");
        } else {
          toast.error("No website found for this business.");
        }
        setLaunchBusy(false);
        return;
      }

      const projectId = makeProjectId();
      seedEntrance(launchUrl, projectId);
      router.push(buildStudioEditorPath(projectId));
      // Stay "Launching..." until this page unmounts — do not reset here (router.push is non-blocking).
    } catch {
      setLaunchBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#000000] font-sans text-white antialiased">
      {/* Top nav — Vibe parity */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#000000]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-2">
            <span className="font-[var(--font-montserrat)] text-[22px] font-bold tracking-[-0.02em] text-white lowercase">
              vibe
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-[14px] font-medium text-white/75 md:flex">
            {["Product", "Industries", "Pricing", "Testimonials", "Resources"].map(
              (t) => (
                <a
                  key={t}
                  className="inline-flex items-center gap-0.5 hover:text-white"
                  href="#"
                >
                  {t}
                  <ChevronDown className="size-3.5 opacity-60" aria-hidden />
                </a>
              ),
            )}
            <a className="text-white hover:text-white/90" href="#">
              Log in →
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[880px] flex-col items-center px-5 pb-20 pt-14 md:px-8 md:pt-16">
        <h1 className="text-center font-[var(--font-montserrat)] text-[40px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white md:text-[52px] md:leading-[1.06]">
          No Creative? No Problem.
          <br />
          We’ve got you covered.
        </h1>
        <p className="mt-5 max-w-[560px] text-center text-[15px] leading-relaxed text-white/65 md:text-[16px]">
          Type your business name or URL, and we’ll turn it into a TV ad—instantly.
        </p>

        {/* Search */}
        <div className="relative mt-9 w-full max-w-[520px]">
          <div
            className="flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5"
            style={{
              boxShadow:
                "0 0 0 1.5px rgba(139,92,246,0.35), 0 0 0 1px rgba(56,189,248,0.2), 0 0 32px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <Search className="size-[18px] shrink-0 text-white/55" strokeWidth={2} />
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSelectedPlaceId(null);
              }}
              placeholder="Enter your URL or your business name (Google Maps)"
              className="w-full min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !launchBusy) void onLaunch();
              }}
              aria-label="URL or business name"
            />
          </div>
          <p className="mt-2 text-center text-[13px] leading-snug text-white/45">
            Enter a valid URL
          </p>
          <p className="text-center text-[13px] leading-snug text-white/45">
            Enter the name of a business in Google Maps.
          </p>

          {/* Suggestions dropdown */}
          {notValidUrlText && showSuggestions ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.1] bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
              <div className="border-b border-white/[0.06] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                Suggestion via Google Maps
              </div>
              <div>
                {predictions.map((p) => (
                  <button
                    key={p.place_id}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceId(p.place_id);
                      setValue(p.description);
                      setNotValidUrlText(null);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-start gap-3 border-b border-white/[0.04] px-4 py-3.5 text-left text-[14px] last:border-b-0 hover:bg-white/[0.04]"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/50" />
                    <span className="leading-snug text-white/[0.92]">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Not-a-URL message */}
          {notValidUrlText && !showSuggestions ? (
            <div className="mt-2 rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3 text-[14px] text-red-100/95">
              &ldquo;{notValidUrlText}&rdquo; is not a valid URL.
            </div>
          ) : null}
        </div>

        {/* Checklist */}
        <ul className="mt-8 flex flex-col items-start gap-3 text-[15px] text-white/70 md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-x-10 md:gap-y-3">
          {[
            "Video ready in less that 30 seconds",
            "100% free",
            "Based on your business & customizable",
          ].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-400">
                ✓
              </span>
              <span className="leading-snug">{t}</span>
            </li>
          ))}
        </ul>

        {/* Launch */}
        <button
          type="button"
          onClick={() => void onLaunch()}
          disabled={launchBusy}
          aria-busy={launchBusy}
          className={[
            "mt-10 inline-flex h-[48px] w-full max-w-[280px] items-center justify-center rounded-full bg-violet-500 px-8 text-[15px] font-semibold text-white shadow-[0_18px_48px_rgba(124,58,237,0.38)]",
            "transition-[transform,opacity,background-color,box-shadow] duration-300 ease-out",
            "hover:bg-violet-400 enabled:hover:shadow-[0_20px_52px_rgba(124,58,237,0.42)]",
            "active:enabled:scale-[0.985]",
            "disabled:cursor-wait disabled:opacity-85 disabled:hover:bg-violet-500",
          ].join(" ")}
        >
          <span
            className={
              launchBusy
                ? "tracking-wide text-white/95 motion-safe:animate-pulse"
                : undefined
            }
          >
            {launchBusy ? "Launching..." : "Launch"}
          </span>
        </button>
      </main>
    </div>
  );
}

