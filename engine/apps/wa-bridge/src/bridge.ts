import { randomUUID } from "node:crypto";
import type { CampusClient } from "@agent-campus/engine";
import { agentsToJoin } from "./agentDiff";
import { createProximityState, proximityTick } from "./proximity";
import { resolveWaRoomUrl } from "./roomUrl";
import type { AgentRef, WaBridgeConfig } from "./types";
import { joinWaSession, type WaSession } from "./waSession";
import type { WorkRoutineRunner } from "./workRoutineRunner";

export class AgentWaBridge {
  readonly #cfg: WaBridgeConfig;
  readonly #sessions = new Map<string, WaSession>();
  readonly #joining = new Set<string>();
  readonly #attempts = new Map<string, number>();
  #latestAgents: AgentRef[] = [];
  #closed = false;
  #work: WorkRoutineRunner | undefined;
  #client: CampusClient | undefined;
  #proximity = createProximityState();
  #proximityTimer: ReturnType<typeof setInterval> | undefined;

  constructor(cfg: WaBridgeConfig, work?: WorkRoutineRunner, client?: CampusClient) {
    this.#cfg = cfg;
    this.#work = work;
    this.#client = client;
    this.#work?.setQueuedChecker((id) => this.#sessions.get(id)?.social() === "queued");
    if (cfg.routinesEnabled) {
      this.#proximityTimer = setInterval(() => this.#runProximity(), 1_200);
    }
  }

  sync(agents: AgentRef[]): void {
    if (this.#closed) return;
    this.#latestAgents = agents;
    this.#work?.setAgents(agents);

    const byId = new Map(agents.map((a) => [a.id, a]));
    for (const [id, session] of this.#sessions) {
      const agent = byId.get(id);
      if (!agent || agent.kind !== "named") {
        session.close();
        this.#sessions.delete(id);
        continue;
      }
      const want = resolveWaRoomUrl(agent, this.#cfg.waRoomUrl);
      if (want !== session.roomUrl) {
        console.info(`[wa-bridge] room URL changed for ${id}; re-joining`);
        session.close();
        this.#sessions.delete(id);
      }
    }

    const joined = new Set(this.#sessions.keys());
    for (const agent of agentsToJoin(agents, joined)) {
      this.#ensureJoined(agent);
    }
  }

  #ensureJoined(agent: AgentRef): void {
    if (this.#closed || this.#joining.has(agent.id) || this.#sessions.has(agent.id)) return;
    this.#joining.add(agent.id);
    void this.#joinLoop(agent).finally(() => {
      this.#joining.delete(agent.id);
    });
  }

  async #joinLoop(agent: AgentRef): Promise<void> {
    while (!this.#closed && !this.#sessions.has(agent.id)) {
      const attempt = (this.#attempts.get(agent.id) ?? 0) + 1;
      this.#attempts.set(agent.id, attempt);
      try {
        const session = await joinWaSession(agent, this.#cfg, {
          onDisconnect: () => {
            console.warn(`[wa-bridge] session dropped for ${agent.id}; will re-join`);
            this.#sessions.delete(agent.id);
            const again = this.#latestAgents.find((a) => a.id === agent.id);
            if (again) this.#ensureJoined(again);
          },
        });
        if (this.#closed) {
          session.close();
          return;
        }
        this.#sessions.set(agent.id, session);
        this.#attempts.delete(agent.id);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const delay = Math.min(
          this.#cfg.reconnectBaseMs * 2 ** Math.min(attempt - 1, 5),
          this.#cfg.reconnectMaxMs,
        );
        console.error(`[wa-bridge] join ${agent.id} attempt ${attempt} failed: ${msg}; retry in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  #runProximity(): void {
    if (this.#closed) return;
    const agents = [...this.#sessions.values()].map((s) => {
      const p = s.position();
      return { id: s.agentId, name: s.name, x: p.x, y: p.y, social: s.social() };
    });
    const actions = proximityTick(agents, this.#proximity, {
      thresholdPx: 96,
      replyWindowMs: 12_000,
      nowMs: Date.now(),
    });

    for (const action of actions) {
      const from = this.#sessions.get(action.fromId);
      const to = this.#sessions.get(action.toId);
      if (!from || !to) continue;

      if (action.type === "greet") {
        from.say(action.text);
        from.setSocial("greeted");
        console.info(`[wa-bridge] greet [${action.zone}] ${action.fromId} → ${action.toId}: ${action.text}`);
        void this.#campusNote(action.fromId, action.text);
      } else {
        from.say(action.text);
        from.setQueued(true, this.#cfg.queueHoldMs);
        to.setQueued(true, this.#cfg.queueHoldMs);
        this.#work?.markQueued(action.fromId);
        this.#work?.markQueued(action.toId);
        // Do NOT moveTo / snap agents — WA collision would shove the human player.
        console.info(
          `[wa-bridge] QUEUED [${action.zone}] ${action.fromId} & ${action.toId}: hold ${this.#cfg.queueHoldMs}ms then resume`,
        );
        void this.#campusNote(action.fromId, action.text);
        void this.#campusNote(
          action.toId,
          `${to.name}: QUEUED — conversación con ${from.name}; espero órdenes.`,
        );
      }
    }
  }

  async #campusNote(agentId: string, text: string): Promise<void> {
    if (!this.#client) return;
    try {
      await this.#client.send({
        type: "chat.send",
        message: { id: randomUUID(), agentId, from: "agent", text },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[wa-bridge] proximity chat failed: ${msg}`);
    }
  }

  close(): void {
    this.#closed = true;
    if (this.#proximityTimer) clearInterval(this.#proximityTimer);
    this.#work?.close();
    for (const session of this.#sessions.values()) {
      session.close();
    }
    this.#sessions.clear();
  }

  joinedIds(): string[] {
    return [...this.#sessions.keys()];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
