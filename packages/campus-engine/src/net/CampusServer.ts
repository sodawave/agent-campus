/**
 * CampusServer — exposes the {@link CampusCore} over a transport.
 *
 * Accepts a serialized (JSON) {@link CampusCommand}, executes it through the
 * core (authoritative validation + sequencing), and publishes the resulting
 * {@link CampusEvent}s on the campus channel via an {@link AgentCommsPort}. On
 * rejection it publishes nothing and state is unchanged.
 */

import type { AgentCommsPort, CommsChannel } from "../domain/comms";
import type { CampusCommand, CampusEvent, Id } from "../domain/types";
import type { CampusState } from "../store/CampusStore";
import type { CampusCore, CommandResult } from "../core/CampusCore";

const KNOWN_COMMANDS = new Set<CampusCommand["type"]>([
  "agent.spawn",
  "worker.spawn",
  "worker.despawn",
  "building.spawn",
  "room.spawn",
  "room.assignHead",
  "agent.callToBuilding",
  "agent.returnHome",
  "host.join",
  "host.spawnRuntime",
  "host.stopRuntime",
  "host.leave",
  "agent.introduce",
  "agent.order",
  "speckit.enable",
  "speckit.advancePhase",
  "speckit.addArtifact",
]);

export class CampusServer {
  constructor(
    private readonly core: CampusCore,
    private readonly bus: AgentCommsPort,
    private readonly campusId: Id = "campus",
  ) {}

  private channel(): CommsChannel {
    return { scope: "campus", campusId: this.campusId };
  }

  /** Handle a command that arrived over the wire (JSON string). */
  async submit(commandJson: string): Promise<CommandResult> {
    let command: CampusCommand;
    try {
      command = JSON.parse(commandJson) as CampusCommand;
    } catch {
      return { ok: false, reason: "invalid_json" };
    }
    if (!command || !KNOWN_COMMANDS.has(command.type)) {
      return { ok: false, reason: "unknown_command" };
    }

    const result = this.core.execute(command);
    if (result.ok) {
      for (const event of result.events) {
        await this.bus.publish(this.channel(), event);
      }
    }
    return result;
  }

  /** Authoritative snapshot (for a consumer to catch up). */
  state(): CampusState {
    return this.core.state();
  }

  /** Ordered event log for a late-joining consumer to replay. */
  log(): readonly CampusEvent[] {
    return this.core.eventLog();
  }
}
