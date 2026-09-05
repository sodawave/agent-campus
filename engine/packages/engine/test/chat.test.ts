import { describe, expect, it } from "vitest";
import { CampusStore, messagesForAgent } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Empresa A" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Ada", buildingId: "b1", roomId: "r1" });
  return store;
}

describe("chat.send (user <-> agent thread)", () => {
  it("posts a user message and an agent reply to the agent's thread (in order)", () => {
    const store = seeded();
    expect(store.chat.send({ id: "m1", agentId: "a1", from: "user", text: "hola" }).ok).toBe(true);
    expect(store.chat.send({ id: "m2", agentId: "a1", from: "agent", text: "hola, dime" }).ok).toBe(true);
    const thread = messagesForAgent(store.state(), "a1");
    expect(thread.map((m) => [m.from, m.text])).toEqual([
      ["user", "hola"],
      ["agent", "hola, dime"],
    ]);
  });

  it("scopes messages per agent", () => {
    const store = seeded();
    store.agent.instantiate({ id: "a2", name: "Ben", buildingId: "b1", roomId: "r1" });
    store.chat.send({ id: "m1", agentId: "a1", from: "user", text: "a1" });
    store.chat.send({ id: "m2", agentId: "a2", from: "user", text: "a2" });
    expect(messagesForAgent(store.state(), "a1").map((m) => m.id)).toEqual(["m1"]);
    expect(messagesForAgent(store.state(), "a2").map((m) => m.id)).toEqual(["m2"]);
  });

  it("rejects unknown agent and duplicate id", () => {
    const store = seeded();
    expect(store.chat.send({ id: "m1", agentId: "ghost", from: "user", text: "x" })).toEqual({ ok: false, reason: "agent_not_found" });
    store.chat.send({ id: "m1", agentId: "a1", from: "user", text: "x" });
    expect(store.chat.send({ id: "m1", agentId: "a1", from: "agent", text: "dup" })).toEqual({ ok: false, reason: "duplicate_id" });
  });
});
