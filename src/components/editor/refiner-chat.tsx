"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { refineTimelineAction } from "@/app/actions/refine-timeline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { serializeTimelineState } from "@/lib/timeline/serialize";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export function RefinerChat() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const applyRefinementPatch = useTimelineStore((s) => s.applyRefinementPatch);

  async function onSend() {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      toast.message("Add more detail for the refiner.");
      return;
    }
    setBusy(true);
    try {
      const state = useTimelineStore.getState();
      const json = JSON.stringify(serializeTimelineState(state));
      const res = await refineTimelineAction(json, trimmed);
      if (!res.ok) {
        toast.error("Refiner failed", { description: res.error });
        return;
      }
      applyRefinementPatch(res.patch);
      toast.success("Timeline updated", {
        description: "Gemini patch applied.",
      });
      setPrompt("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80 bg-card/50 shadow-none backdrop-blur-md">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-semibold">Refiner</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Command the timeline in plain language. We send your prompt plus the
          full timeline JSON to Gemini and merge the patch instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "Make scene 1 two seconds longer" or "Switch primary color to #f97316"'
          rows={5}
          disabled={busy}
          className="resize-none border-border/80 bg-background/40 text-sm backdrop-blur-sm"
        />
        <Button
          type="button"
          className="w-full gap-2"
          disabled={busy}
          onClick={() => void onSend()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send to Gemini
        </Button>
      </CardContent>
    </Card>
  );
}
