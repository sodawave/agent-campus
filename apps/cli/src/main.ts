/**
 * campus — CLI host (execution plane). Connects to the campus core over
 * WebSocket, joins as a host and starts/stops agent runtimes. No credentials
 * yet (a future Control Panel will define the connection token, language,
 * server timezone, etc.).
 *
 * Usage:
 *   campus status
 *   campus host-join --label laptop-ana [--id h-xyz]
 *   campus host-leave --host h-xyz
 *   campus runtime-start --host h-xyz --agent a-ivan [--id rt-1] [--dir /repo]
 *   campus runtime-stop --runtime rt-1
 *   campus watch
 *
 * Core URL: $CAMPUS_URL (default ws://localhost:8787)
 */

import WebSocket from "ws";
import {
  CampusClient,
  type Connection,
  type State,
} from "@agent-campus/campus-engine";

const URL = process.env.CAMPUS_URL ?? "ws://localhost:8787";

function wsConnection(ws: WebSocket): Connection {
  return {
    send: (data) => ws.send(data),
    onMessage: (cb) => ws.on("message", (raw) => cb(raw.toString())),
    onClose: (cb) => ws.on("close", cb),
    close: () => ws.close(),
  };
}

function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a && a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return flags;
}

/** Connect and resolve once the initial snapshot has been projected. */
function connect(): Promise<{ client: CampusClient; ws: WebSocket }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const client = new CampusClient(wsConnection(ws));
    let done = false;
    const unsub = client.subscribe(() => {
      if (done) return;
      done = true;
      unsub();
      resolve({ client, ws });
    });
    ws.on("error", (err) => {
      if (!done) reject(err);
    });
  });
}

function printState(state: State): void {
  const campus = state.campus ? `${state.campus.name} (${state.campus.id})` : "(none)";
  console.log(`campus:     ${campus}`);
  console.log(`buildings:  ${state.buildings.map((b) => b.name).join(", ") || "-"}`);
  console.log(
    `agents:     ${state.agents
      .map((a) => `${a.name}${a.rankKey ? "/" + a.rankKey : ""}${a.runtimeId ? " [live]" : ""}`)
      .join(", ") || "-"}`,
  );
  console.log(`workers:    ${state.workers.length}`);
  console.log(
    `hosts:      ${state.hosts.map((h) => `${h.label}(${h.status})`).join(", ") || "-"}`,
  );
  console.log(
    `runtimes:   ${state.runtimes
      .map((r) => `${r.agentId}:${r.status}${r.workingDir ? "@" + r.workingDir : ""}`)
      .join(", ") || "-"}`,
  );
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log("campus <status|host-join|host-leave|runtime-start|runtime-stop|watch> [--flags]");
    console.log(`core: ${URL} (set $CAMPUS_URL to override)`);
    process.exit(0);
  }

  console.log(`[campus] connecting to ${URL} …`);
  const { client, ws } = await connect();
  console.log("[campus] connected.");

  const finish = (code = 0): never => {
    ws.close();
    process.exit(code);
  };

  switch (cmd) {
    case "status": {
      printState(client.state());
      finish();
      break;
    }
    case "watch": {
      console.log("[campus] watching state (Ctrl-C to stop)…");
      printState(client.state());
      client.subscribe((s) => {
        console.log("---");
        printState(s);
      });
      break; // stay alive
    }
    case "host-join": {
      const id = flags.id ?? `h-${Date.now().toString(36)}`;
      const label = flags.label ?? id;
      const res = await client.send({ type: "host.join", id, label });
      console.log(res.ok ? `[campus] host joined: ${label} (${id})` : `[campus] rejected: ${res.reason}`);
      finish(res.ok ? 0 : 1);
      break;
    }
    case "host-leave": {
      const hostId = flags.host ?? "";
      const res = await client.send({ type: "host.leave", hostId });
      console.log(res.ok ? `[campus] host left: ${hostId}` : `[campus] rejected: ${res.reason}`);
      finish(res.ok ? 0 : 1);
      break;
    }
    case "runtime-start": {
      const id = flags.id ?? `rt-${Date.now().toString(36)}`;
      const hostId = flags.host ?? "";
      const agentId = flags.agent ?? "";
      const res = await client.send({
        type: "runtime.start",
        id,
        hostId,
        agentId,
        ...(flags.dir ? { workingDir: flags.dir } : {}),
      });
      console.log(res.ok ? `[campus] runtime started: ${id} (agent ${agentId} on ${hostId})` : `[campus] rejected: ${res.reason}`);
      finish(res.ok ? 0 : 1);
      break;
    }
    case "runtime-stop": {
      const runtimeId = flags.runtime ?? "";
      const res = await client.send({ type: "runtime.stop", runtimeId });
      console.log(res.ok ? `[campus] runtime stopped: ${runtimeId}` : `[campus] rejected: ${res.reason}`);
      finish(res.ok ? 0 : 1);
      break;
    }
    default:
      console.error(`[campus] unknown command: ${cmd}`);
      finish(1);
  }
}

main().catch((err) => {
  console.error(`[campus] error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
