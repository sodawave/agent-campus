import { defineConfig } from "vite";

// Allow access over Tailscale MagicDNS (e.g. http://cursor-campus:5173) in addition
// to localhost/IP. `.ts.net` covers the full MagicDNS FQDN if used.
const allowedHosts = ["cursor-campus", ".ts.net", "localhost"];

export default defineConfig({
  server: { host: true, port: 5173, strictPort: true, allowedHosts },
  preview: { host: true, port: 4173, allowedHosts },
});
