// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The v0/Vercel sandbox preview proxy forwards to the port exposed via DEV_PORT
// (e.g. 5173). The Lovable config otherwise defaults the dev server to 8080,
// which the proxy can't reach — causing "failed to load preview". Bind the dev
// server to DEV_PORT when present so the preview panel resolves correctly.
const devPort = process.env.DEV_PORT ? Number(process.env.DEV_PORT) : undefined;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      ...(devPort ? { port: devPort } : {}),
      host: true,
      strictPort: false,
    },
  },
});
