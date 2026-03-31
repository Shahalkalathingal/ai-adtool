"use client";

import { StudioEntranceGate } from "@/components/studio/studio-entrance-gate";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <StudioEntranceGate>{children}</StudioEntranceGate>
      <Toaster position="top-center" richColors />
    </TooltipProvider>
  );
}
