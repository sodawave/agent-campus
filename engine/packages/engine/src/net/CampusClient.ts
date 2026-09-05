/**
 * CampusClient — read-only projection of the core over a connection. Applies
 * the snapshot log and subsequent events with `reduce`, and sends commands
 * (resolving with the server's CommandResult).
 */

import type { CampusCommand, CommandResult } from "../domain/commands";
import { reduce, reduceAll } from "../domain/reduce";
import { EMPTY_STATE, type State } from "../domain/types";
import type { Connection } from "./connection";
import type { ClientMessage, ServerMessage } from "./protocol";

type Listener = (state: State) => void;

export class CampusClient {
  #conn: Connection;
  #state: State = EMPTY_STATE;
  #listeners = new Set<Listener>();
  #pending = new Map<string, (result: CommandResult) => void>();
  #seq = 0;

  constructor(conn: Connection) {
    this.#conn = conn;
    conn.onMessage((raw) => {
      const message = JSON.parse(raw) as ServerMessage;
      switch (message.type) {
        case "snapshot":
          this.#state = reduceAll(EMPTY_STATE, message.log);
          this.#notify();
          break;
        case "event": {
          const next = reduce(this.#state, message.event);
          if (next !== this.#state) {
            this.#state = next;
            this.#notify();
          }
          break;
        }
        case "result": {
          const resolve = this.#pending.get(message.id);
          if (resolve) {
            this.#pending.delete(message.id);
            resolve(message.result);
          }
          break;
        }
      }
    });
  }

  state(): State {
    return this.#state;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this.#state);
  }

  send(command: CampusCommand): Promise<CommandResult> {
    const id = String(++this.#seq);
    return new Promise((resolve) => {
      this.#pending.set(id, resolve);
      this.#conn.send(
        JSON.stringify({ type: "command", id, command } satisfies ClientMessage),
      );
    });
  }
}
