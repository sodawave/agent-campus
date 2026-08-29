/**
 * CampusCore — the authoritative control-plane boundary.
 *
 * Wraps a {@link CampusStore} (the domain projection + rules) and exposes the
 * **Command → Event** contract: consumers send a {@link CampusCommand} (a
 * request), the core validates it against the domain, **sequences** the
 * resulting {@link CampusEvent}s, and returns them (or a rejection without
 * changing state). Consumers project state via snapshot + event replay.
 *
 * This is the minimal, in-memory first layer (constitution VIII): in-process,
 * no network, minimal command subset. Network transport (AgentCommsPort over
 * WS) and durability are later layers.
 */

import { CampusStore } from "../store/CampusStore";
import type { CampusState, LoadCampusInput } from "../store/CampusStore";
import type { CampusCommand, CampusEvent } from "../domain/types";

export type CommandResult =
  | { ok: true; events: CampusEvent[] }
  | { ok: false; reason: string };

type Listener = (state: CampusState, event: CampusEvent | null) => void;

export class CampusCore {
  private readonly store: CampusStore;

  constructor(store?: CampusStore) {
    this.store = store ?? new CampusStore();
  }

  /** Bootstrap the campus (loading is not a governed Command in this layer). */
  load(input: LoadCampusInput): void {
    this.store.campus.load(input);
  }

  /** Current authoritative snapshot for a consumer to project. */
  state(): CampusState {
    return this.store.getState();
  }

  /** Ordered log of facts a late consumer can replay to reach state. */
  eventLog(): readonly CampusEvent[] {
    return this.store.getEventLog();
  }

  subscribe(listener: Listener): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * Execute a Command: validate via the domain, sequence the resulting events,
   * and return them. On rejection, state is unchanged and `ok` is false.
   */
  execute(command: CampusCommand): CommandResult {
    const events: CampusEvent[] = [];
    const unsubscribe = this.store.subscribe((_state, event) => {
      if (event) events.push(event);
    });
    try {
      switch (command.type) {
        case "agent.spawn": {
          this.store.agent.spawn(command.request);
          return { ok: true, events };
        }
        case "worker.spawn": {
          const result = this.store.worker.spawn({
            actorId: command.actorId,
            skill: command.skill,
            label: command.label,
            spriteKey: command.spriteKey,
          });
          return result.ok
            ? { ok: true, events }
            : { ok: false, reason: result.reason };
        }
        case "worker.despawn": {
          const result = this.store.worker.despawn({
            actorId: command.actorId,
            workerId: command.workerId,
          });
          return result.ok
            ? { ok: true, events }
            : { ok: false, reason: result.reason };
        }
      }
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "command_failed",
      };
    } finally {
      unsubscribe();
    }
  }
}
