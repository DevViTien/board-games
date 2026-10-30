import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source instead of a build step.
  transpilePackages: ["@board-games/ui"],
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
