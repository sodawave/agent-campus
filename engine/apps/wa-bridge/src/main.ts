import { startCampusListener } from "./campusListener";
import { loadConfig } from "./config";
import { AgentWaBridge } from "./bridge";
import { startPresenceHttp } from "./presenceHttp";
import { WorkRoutineRunner } from "./workRoutineRunner";

const cfg = loadConfig();

console.info(`[wa-bridge] campus=${cfg.campusWsUrl}`);
console.info(`[wa-bridge] waPlay=${cfg.waPlayUrl}`);
console.info(`[wa-bridge] waRoom=${cfg.waRoomUrl}`);
console.info(
  `[wa-bridge] routines=${cfg.routinesEnabled ? "on" : "off"} idle=${cfg.routineIdleMs}ms work=${cfg.routineWorkMs}ms`,
);

let bridge!: AgentWaBridge;

const listener = startCampusListener(cfg.campusWsUrl, (agents) => {
  bridge.sync(agents);
});

const work = cfg.routinesEnabled
  ? new WorkRoutineRunner(listener.client, cfg.routineWorkMs)
  : undefined;
work?.start();

bridge = new AgentWaBridge(cfg, work, listener.client);
const presence = await startPresenceHttp(bridge, cfg.presencePort);

const shutdown = () => {
  console.info("[wa-bridge] shutting down");
  void presence.close();
  listener.close();
  bridge.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
