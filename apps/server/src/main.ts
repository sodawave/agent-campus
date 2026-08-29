import { startCampusServer } from "./server";
import { createSeededCore } from "./seed";

const core = createSeededCore();
const port = Number(process.env.PORT ?? 8787);

const server = await startCampusServer(core, port, (message) =>
  console.log("[core]", message),
);

console.log(
  `[core] headless campus core listening on ws://localhost:${server.port} (no screen)`,
);
