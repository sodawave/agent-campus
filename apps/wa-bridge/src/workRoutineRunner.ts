import { randomUUID } from "node:crypto";
import type { CampusClient } from "@agent-campus/campus-engine";
import type { AgentRef } from "./types";
import { nextWorkPhase, workChatText, type WorkPhase } from "./workRoutine";

/**
 * Periodically posts scripted agent chat messages into the campus core.
 * While social hold (QUEUED) is active, announce once; after hold ends, resume rotation.
 */
export class WorkRoutineRunner {
  readonly #client: CampusClient;
  readonly #intervalMs: number;
  readonly #phases = new Map<string, WorkPhase>();
  readonly #queuedAnnounced = new Set<string>();
  #isQueued: (agentId: string) => boolean = () => false;
  #agents: AgentRef[] = [];
  #timer: ReturnType<typeof setInterval> | undefined;
  #closed = false;

  constructor(client: CampusClient, intervalMs: number) {
    this.#client = client;
    this.#intervalMs = intervalMs;
  }

  setQueuedChecker(fn: (agentId: string) => boolean): void {
    this.#isQueued = fn;
  }

  setAgents(agents: AgentRef[]): void {
    this.#agents = agents.filter((a) => a.kind === "named");
  }

  markQueued(agentId: string): void {
    this.#phases.set(agentId, "queued");
  }

  start(): void {
    if (this.#timer || this.#intervalMs <= 0) return;
    this.#timer = setInterval(() => {
      void this.tick();
    }, this.#intervalMs);
    setTimeout(() => {
      void this.tick();
    }, 3_000);
  }

  async tick(): Promise<void> {
    if (this.#closed) return;
    for (const agent of this.#agents) {
      const forcedQueued = this.#isQueued(agent.id);
      let phase = this.#phases.get(agent.id) ?? "idle";
      if (forcedQueued) {
        phase = "queued";
        this.#phases.set(agent.id, "queued");
        if (this.#queuedAnnounced.has(agent.id)) continue;
        this.#queuedAnnounced.add(agent.id);
      } else {
        if (phase === "queued") {
          // Hold ended — resume normal rotation.
          this.#queuedAnnounced.delete(agent.id);
          phase = "idle";
        }
        phase = nextWorkPhase(phase);
        this.#phases.set(agent.id, phase);
      }
      const text = workChatText(agent.name, agent.skillKey, phase);
      try {
        await this.#client.send({
          type: "chat.send",
          message: {
            id: randomUUID(),
            agentId: agent.id,
            from: "agent",
            text,
          },
        });
        console.info(`[wa-bridge] work chat ${agent.id} [${phase}]: ${text}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[wa-bridge] work chat failed for ${agent.id}: ${msg}`);
      }
    }
  }

  close(): void {
    this.#closed = true;
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = undefined;
  }
}
