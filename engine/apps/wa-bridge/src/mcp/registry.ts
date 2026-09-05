import type { WaSession } from "../waSession";

/** In-process sessions owned by the WA MCP server (not the campus sync bridge). */
export class WaMcpRegistry {
  readonly #sessions = new Map<string, WaSession>();

  list(): Array<{ id: string; name: string; x: number; y: number; zone: string }> {
    return [...this.#sessions.values()].map((s) => {
      const p = s.position();
      return { id: s.agentId, name: s.name, x: p.x, y: p.y, zone: s.zone() };
    });
  }

  get(id: string): WaSession | undefined {
    return this.#sessions.get(id);
  }

  set(session: WaSession): void {
    const prev = this.#sessions.get(session.agentId);
    if (prev && prev !== session) prev.close();
    this.#sessions.set(session.agentId, session);
  }

  delete(id: string): boolean {
    const s = this.#sessions.get(id);
    if (!s) return false;
    s.close();
    this.#sessions.delete(id);
    return true;
  }

  closeAll(): void {
    for (const s of this.#sessions.values()) s.close();
    this.#sessions.clear();
  }
}
