/**
 * Wire protocol between a core server and its clients. All messages are
 * JSON-serializable (language-neutral, Constitución IV).
 */

import type { CampusCommand, CommandResult } from "../domain/commands";
import type { CampusEvent } from "../domain/types";

/** Client -> server. */
export type ClientMessage = {
  type: "command";
  /** Correlation id so the sender can match the result. */
  id: string;
  command: CampusCommand;
};

/** Server -> client. */
export type ServerMessage =
  | { type: "snapshot"; log: CampusEvent[] }
  | { type: "event"; event: CampusEvent }
  | { type: "result"; id: string; result: CommandResult };
