import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Source map upload only runs when SENTRY_AUTH_TOKEN is set (CI/Vercel).
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
