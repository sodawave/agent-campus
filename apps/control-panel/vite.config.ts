import { defineConfig } from "vite";

const allowedHosts = ["localhost", "cursor-campus", ".ts.net"];

export default defineConfig({
  server: { host: true, port: 5174, strictPort: true, allowedHosts },
  preview: { host: true, port: 4174, allowedHosts },
});
