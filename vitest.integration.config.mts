import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests: run against the local Supabase stack (`npm run db:start`).
// RLS/isolation tests (NF-1) live here.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
