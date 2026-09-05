import { CampusClient, type Connection, type State } from "@agent-campus/engine";
import WebSocket from "ws";
import type { AgentRef } from "./types";

function wsConnection(ws: WebSocket): Connection {
  return {
    send: (data) => ws.send(data),
    onMessage: (cb) => {
      ws.on("message", (raw) => cb(typeof raw === "string" ? raw : raw.toString()));
    },
    onClose: (cb) => {
      ws.on("close", () => cb());
    },
    close: () => ws.close(),
  };
}

function toAgentRefs(state: State): AgentRef[] {
  const urls = new Map(state.buildings.map((b) => [b.id, b.waRoomUrl ?? null] as const));
  return state.agents.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    buildingId: a.buildingId,
    roomId: a.roomId,
    ...(a.skillKey !== undefined ? { skillKey: a.skillKey } : {}),
    ...(a.appearance !== undefined ? { appearance: a.appearance } : {}),
    waRoomUrl: urls.get(a.buildingId) ?? null,
  }));
}

export interface CampusListener {
  readonly client: CampusClient;
  close(): void;
}

/**
 * Connects to the campus core and invokes `onAgents` whenever the agent projection may have changed.
 */
export function startCampusListener(
  campusWsUrl: string,
  onAgents: (agents: AgentRef[]) => void,
): CampusListener {
  const ws = new WebSocket(campusWsUrl);
  const client = new CampusClient(wsConnection(ws));

  client.subscribe((state) => {
    onAgents(toAgentRefs(state));
  });

  ws.on("open", () => {
    console.info(`[wa-bridge] connected to campus at ${campusWsUrl}`);
  });
  ws.on("error", (err) => {
    console.error(`[wa-bridge] campus ws error:`, err.message);
  });
  ws.on("close", () => {
    console.warn(`[wa-bridge] campus ws closed`);
  });

  return {
    client,
    close() {
      ws.close();
    },
  };
}
