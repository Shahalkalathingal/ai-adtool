import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        AI Ad Studio
      </p>
      <h1 className="mt-4 max-w-xl text-center text-3xl font-semibold tracking-tight">
        URL-to-video, with frame-accurate control.
      </h1>
      <p className="mt-4 max-w-lg text-center text-sm leading-relaxed text-muted-foreground">
        Firecrawl + Gemini Director, Remotion preview, and a multi-track
        timeline — built for long-form vertical ads.
      </p>
      <Button
        asChild
        size="lg"
        className="mt-10 rounded-full px-8"
      >
        <Link href="/editor/demo">Open editor</Link>
      </Button>
<br></br>
<br></br>
<br></br>
<br></br>
<p style={{ fontSize: '14px' }} className="mt-4 max-w-lg text-center text-sm leading-relaxed text-muted-foreground">
ONGOING DEVELOPMENT... NOT FULLY READY FOR USE - Shahal K

      </p>

    </div>
  );
}
