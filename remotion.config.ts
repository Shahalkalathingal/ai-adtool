import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.overrideWebpackConfig((currentConfiguration) => {
  const alias = currentConfiguration.resolve?.alias;
  const existing =
    alias && typeof alias === "object" && !Array.isArray(alias)
      ? (alias as Record<string, string | string[] | false>)
      : {};
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...existing,
        "@": path.resolve(process.cwd(), "src"),
      },
    },
  };
});
