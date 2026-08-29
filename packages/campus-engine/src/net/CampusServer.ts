/**
 * CampusServer — wraps a CampusStore and exposes it over connections. On
 * connect it sends a snapshot (full event log). Client commands are validated
 * by the store; the sender gets a result, and accepted events are broadcast to
 * every connection so all clients converge.
 */

import { CampusStore } from "../store/CampusStore";
import type { CampusEvent, State } from "../domain/types";
import type { Connection } from "./connection";
import type { ClientMessage, ServerMessage } from "./protocol";

export class CampusServer {
  #store: CampusStore;
  #conns = new Set<Connection>();

  constructor(store?: CampusStore) {
    this.#store = store ?? new CampusStore();
  }

  get store(): CampusStore {
    return this.#store;
  }

  state(): State {
    return this.#store.state();
  }

  log(): readonly CampusEvent[] {
    return this.#store.log();
  }

  #broadcast(message: ServerMessage): void {
    const raw = JSON.stringify(message);
    for (const conn of this.#conns) conn.send(raw);
  }

  handle(conn: Connection): void {
    this.#conns.add(conn);
    conn.onClose(() => this.#conns.delete(conn));

    conn.onMessage((raw) => {
      const message = JSON.parse(raw) as ClientMessage;
      if (message.type !== "command") return;

      const before = this.#store.log().length;
      const result = this.#store.dispatch(message.command);
      conn.send(
        JSON.stringify({ type: "result", id: message.id, result } satisfies ServerMessage),
      );
      // Broadcast only when the command actually appended an event.
      if (result.ok && this.#store.log().length > before) {
        this.#broadcast({ type: "event", event: result.event });
      }
    });

    // Snapshot last so the client (handler already attached) catches up.
    conn.send(
      JSON.stringify({ type: "snapshot", log: [...this.#store.log()] } satisfies ServerMessage),
    );
  }
}
