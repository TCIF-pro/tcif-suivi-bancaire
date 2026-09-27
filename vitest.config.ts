import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests automatiques (`npm test`). Ils testent la logique pure (calculs,
// lecture des PDF...), sans navigateur ni base de données.
export default defineConfig({
  resolve: {
    // Même raccourci que tsconfig.json : `@/lib/...` = `src/lib/...`.
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
