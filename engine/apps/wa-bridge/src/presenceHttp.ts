import { createServer, type Server } from "node:http";
import type { AgentWaBridge } from "./bridge";

export interface PresenceHttp {
  readonly port: number;
  close(): Promise<void>;
}

/**
 * Tiny CORS HTTP server: GET /presence → live WA agent positions from the bridge.
 */
export function startPresenceHttp(bridge: AgentWaBridge, port: number): Promise<PresenceHttp> {
  if (port <= 0) {
    return Promise.resolve({
      port: 0,
      close: async () => undefined,
    });
  }

  const server: Server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && (req.url === "/presence" || req.url?.startsWith("/presence?"))) {
      const body = JSON.stringify({ ok: true, agents: bridge.presence() }, null, 2);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
      return;
    }
    if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, service: "wa-bridge-presence" }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.info(`[wa-bridge] presence http://0.0.0.0:${port}/presence`);
      resolve({
        port,
        close: () =>
          new Promise((resClose, rejClose) => {
            server.close((err) => (err ? rejClose(err) : resClose()));
          }),
      });
    });
  });
}
