/**
 * campus-graphql — HTTP GraphQL surface over the campus core. Connects to the
 * core over WebSocket and serves POST /graphql. No auth yet (Control Panel).
 */

import { createServer } from "node:http";
import { createWsCampusLink } from "./link";
import { executeGraphql, type SecretStore } from "./graphql";

const URL = process.env.CAMPUS_URL ?? "ws://localhost:8787";
const PORT = Number(process.env.GRAPHQL_PORT ?? 8788);

async function main(): Promise<void> {
  const link = await createWsCampusLink(URL);
  // Provider tokens live here (server memory), never in the campus state/log.
  const secrets: SecretStore = new Map();

  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };

  const server = createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors).end();
      return;
    }
    if (req.method !== "POST" || !req.url?.startsWith("/graphql")) {
      res.writeHead(404, cors).end("POST /graphql");
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { query, variables } = JSON.parse(body || "{}");
        const result = await executeGraphql(link, query, variables, secrets);
        res.writeHead(200, { "content-type": "application/json", ...cors });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "content-type": "application/json", ...cors });
        res.end(JSON.stringify({ errors: [{ message: err instanceof Error ? err.message : String(err) }] }));
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.error(`[campus-graphql] connected to core ${URL}; POST http://0.0.0.0:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error(`[campus-graphql] fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
