/**
 * In-memory implementation of {@link AgentCommsPort} (backend `internal`).
 *
 * Transport-agnostic pub/sub of {@link CampusEvent} by channel. The real
 * WS/Redis/Buzz transport is a later thin adapter of the same port; the core,
 * server and client never depend on the concrete transport.
 */

import { channelKey } from "../domain/comms";
import type { AgentCommsPort, CommsChannel } from "../domain/comms";
import type { CampusEvent } from "../domain/types";

type Handler = (event: CampusEvent) => void;

export class InMemoryCommsBus implements AgentCommsPort {
  private readonly handlers = new Map<string, Set<Handler>>();

  async publish(channel: CommsChannel, event: CampusEvent): Promise<void> {
    const set = this.handlers.get(channelKey(channel));
    if (!set) return;
    // Snapshot to tolerate unsubscribe during delivery.
    for (const handler of [...set]) handler(event);
  }

  subscribe(channel: CommsChannel, handler: Handler): () => void {
    const key = channelKey(channel);
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }
}
