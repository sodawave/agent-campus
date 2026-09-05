import { describe, expect, it } from "vitest";
import {
  CampusStore,
  arePeers,
  buildAgent,
  canCommunicate,
  canDebate,
  canEvaluate,
  isDirectLine,
} from "../src/index";

const ic1 = buildAgent({ id: "ic1", name: "A", buildingId: "b", roomId: "r", rankKey: "ic", supervisorId: "lead" });
const ic2 = buildAgent({ id: "ic2", name: "B", buildingId: "b", roomId: "r", rankKey: "ic", supervisorId: "lead" });
const lead = buildAgent({ id: "lead", name: "L", buildingId: "b", roomId: "r", rankKey: "lead" });
const otherIc = buildAgent({ id: "ic3", name: "C", buildingId: "b", roomId: "r", rankKey: "ic", supervisorId: "lead2" });

describe("org helpers (pure)", () => {
  it("isDirectLine: supervisor/report", () => {
    expect(isDirectLine(ic1, lead)).toBe(true);
    expect(isDirectLine(ic1, otherIc)).toBe(false);
  });
  it("arePeers: same rank or same supervisor", () => {
    expect(arePeers(ic1, ic2)).toBe(true); // same rank + same supervisor
    expect(arePeers(ic1, lead)).toBe(false);
  });
  it("canCommunicate: direct line or peers only", () => {
    expect(canCommunicate(ic1, lead)).toBe(true); // report -> supervisor
    expect(canCommunicate(ic1, ic2)).toBe(true); // peers
    expect(canCommunicate(ic1, ic1)).toBe(false); // self
  });
  it("canDebate: same rank only", () => {
    expect(canDebate(ic1, ic2)).toBe(true);
    expect(canDebate(ic1, lead)).toBe(false);
    expect(canDebate(ic1, otherIc)).toBe(true); // same rank ic, different supervisor still debatable
  });
  it("canEvaluate: only direct supervisor", () => {
    expect(canEvaluate(lead, ic1)).toBe(true);
    expect(canEvaluate(ic2, ic1)).toBe(false);
  });
});

function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.agent.instantiate({ id: "ic1", name: "A", buildingId: "b1", roomId: "r1", rankKey: "ic" });
  store.agent.instantiate({ id: "ic2", name: "B", buildingId: "b1", roomId: "r1", rankKey: "ic" });
  store.agent.instantiate({ id: "lead1", name: "L", buildingId: "b1", roomId: "r1", rankKey: "lead" });
  return store;
}

describe("debate.open / close (same-rank gate)", () => {
  it("opens a debate between same-rank peers", () => {
    const store = seededStore();
    const res = store.debate.open({ id: "d1", participantIds: ["ic1", "ic2"], topic: "arch" });
    expect(res.ok).toBe(true);
    expect(store.state().debates[0]).toMatchObject({ id: "d1", status: "open", topic: "arch" });
  });
  it("rejects a debate across ranks", () => {
    const store = seededStore();
    expect(store.debate.open({ id: "d1", participantIds: ["ic1", "lead1"], topic: "x" }))
      .toEqual({ ok: false, reason: "not_same_rank" });
  });
  it("rejects fewer than two participants and unknown participants", () => {
    const store = seededStore();
    expect(store.debate.open({ id: "d1", participantIds: ["ic1"], topic: "x" }))
      .toEqual({ ok: false, reason: "need_two_participants" });
    expect(store.debate.open({ id: "d1", participantIds: ["ic1", "ghost"], topic: "x" }))
      .toEqual({ ok: false, reason: "participant_not_found" });
  });
  it("closes a debate; rejects unknown and double-close", () => {
    const store = seededStore();
    store.debate.open({ id: "d1", participantIds: ["ic1", "ic2"], topic: "x" });
    expect(store.debate.close({ debateId: "d1" }).ok).toBe(true);
    expect(store.state().debates[0]?.status).toBe("closed");
    expect(store.debate.close({ debateId: "d1" })).toEqual({ ok: false, reason: "already_closed" });
    expect(store.debate.close({ debateId: "ghost" })).toEqual({ ok: false, reason: "debate_not_found" });
  });
});
