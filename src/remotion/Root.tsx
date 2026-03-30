import type { ComponentType } from "react";
import { Composition } from "remotion";
import {
  AdStudioComposition,
  type AdStudioExportInputProps,
} from "./compositions/AdStudioComposition";
import { defaultAdStudioExportInputProps } from "@/lib/remotion/default-ad-studio-export-props";

const AdStudioForExport = AdStudioComposition as ComponentType<AdStudioExportInputProps>;

export const RemotionRoot = () => {
  return (
    <Composition
      id="AdStudioExport"
      component={AdStudioForExport}
      durationInFrames={300}
      fps={30}
      width={1280}
      height={720}
      defaultProps={defaultAdStudioExportInputProps}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: props.__compositionDurationInFrames,
        fps: props.__compositionFps,
        width: 1280,
        height: 720,
      })}
    />
  );
};
