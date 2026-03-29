"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { generateDirectorPlanFromUrl } from "@/app/actions/director-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export function DirectorPanel() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : "draft";
  const [url, setUrl] = useState("https://");
  const [pending, setPending] = useState(false);
  const hydrateFromDirectorPlan = useTimelineStore(
    (s) => s.hydrateFromDirectorPlan,
  );

  async function onGenerate() {
    setPending(true);
    try {
      const result = await generateDirectorPlanFromUrl(url);
      if (!result.ok) {
        toast.error("Director failed", { description: result.error });
        return;
      }
      hydrateFromDirectorPlan(result.plan, projectId, {
        sourceUrl: url.trim(),
        contactHints: result.contactHints,
        pageIntel: result.pageIntel,
      });
      toast.success("Timeline generated", {
        description: `${result.plan.scenes.length} scenes · ${Math.round(result.plan.totalDurationSec)}s`,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-border/80 bg-card/50 shadow-none">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">
          URL → Director
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Firecrawl scrapes the page (phone, address, links); Gemini sequences a
          30s+ 16:9 ad with paced scenes, VO, and music lane.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://brand.com"
          className="h-10 font-mono text-xs"
          disabled={pending}
        />
        <Button
          type="button"
          className="w-full gap-2"
          disabled={pending}
          onClick={() => void onGenerate()}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate timeline
        </Button>
      </CardContent>
    </Card>
  );
}
