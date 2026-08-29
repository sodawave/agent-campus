import { defineConfig } from "vite";

// Allow access over localhost, LAN, and Tailscale MagicDNS (e.g. cursor-campus).
const allowedHosts = ["localhost", "cursor-campus", ".ts.net"];

export default defineConfig({
  server: { host: true, port: 5173, strictPort: true, allowedHosts },
  preview: { host: true, port: 4173, allowedHosts },
});
