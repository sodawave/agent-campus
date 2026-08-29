/**
 * Transport-agnostic connection: string messages in/out. The same
 * CampusServer/CampusClient work over this in-memory pair (deterministic,
 * testable) and, later, over a real WebSocket adapter.
 */

export interface Connection {
  send(data: string): void;
  onMessage(cb: (data: string) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

class InMemoryEndpoint implements Connection {
  #peer: InMemoryEndpoint | null = null;
  #handler: ((data: string) => void) | null = null;
  #closeHandlers: (() => void)[] = [];
  #buffer: string[] = [];
  #closed = false;

  bind(peer: InMemoryEndpoint): void {
    this.#peer = peer;
  }

  send(data: string): void {
    if (this.#closed || !this.#peer) return;
    this.#peer.receive(data);
  }

  private receive(data: string): void {
    if (this.#handler) this.#handler(data);
    else this.#buffer.push(data);
  }

  onMessage(cb: (data: string) => void): void {
    this.#handler = cb;
    // Flush anything buffered before the handler was registered.
    const buffered = this.#buffer;
    this.#buffer = [];
    for (const data of buffered) cb(data);
  }

  onClose(cb: () => void): void {
    this.#closeHandlers.push(cb);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    for (const cb of this.#closeHandlers) cb();
    if (this.#peer && !this.#peer.#closed) this.#peer.close();
  }
}

/** Create two connected endpoints (server side, client side). */
export function createInMemoryPair(): [Connection, Connection] {
  const a = new InMemoryEndpoint();
  const b = new InMemoryEndpoint();
  a.bind(b);
  b.bind(a);
  return [a, b];
}
