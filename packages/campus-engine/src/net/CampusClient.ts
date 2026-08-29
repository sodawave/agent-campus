/**
 * CampusClient — a projection-only consumer of the core over a transport.
 *
 * Sends {@link CampusCommand}s (as JSON) to a server-provided `submit`
 * function and subscribes to the campus channel, applying each
 * {@link CampusEvent} to a local projection via the idempotent `reduce`. Holds
 * no business rules (constitution III).
 */

import { CampusStore } from "../store/CampusStore";
import type { CampusState } from "../store/CampusStore";
import type { AgentCommsPort, CommsChannel } from "../domain/comms";
import type { CampusCommand, CampusEvent, Id } from "../domain/types";
import type { CommandResult } from "../core/CampusCore";

type Submit = (commandJson: string) => Promise<CommandResult>;

/** Simulate the wire: everything crossing the boundary is JSON. */
function overWire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class CampusClient {
  private readonly projection = new CampusStore();
  private readonly unsubscribe: () => void;

  constructor(
    bus: AgentCommsPort,
    private readonly submitCommand: Submit,
    campusId: Id = "campus",
  ) {
    const channel: CommsChannel = { scope: "campus", campusId };
    this.unsubscribe = bus.subscribe(channel, (event) => {
      this.projection.dispatch(overWire(event));
    });
  }

  /** Send a command to the core (serialized as JSON). */
  async send(command: CampusCommand): Promise<CommandResult> {
    return this.submitCommand(JSON.stringify(command));
  }

  /** Catch up a late-joining consumer from the authoritative event log. */
  replay(log: readonly CampusEvent[]): void {
    for (const event of log) this.projection.dispatch(overWire(event));
  }

  state(): CampusState {
    return this.projection.getState();
  }

  /** The projection store (read model): consumers read via its helpers. */
  read(): CampusStore {
    return this.projection;
  }

  /** Notified whenever the projection changes (for UI re-render). */
  subscribe(listener: (state: CampusState, event: CampusEvent | null) => void): () => void {
    return this.projection.subscribe(listener);
  }

  dispose(): void {
    this.unsubscribe();
  }
}
