import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

/** Seed: assignee a1 with supervisor sup1. */
function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.agent.instantiate({ id: "sup1", name: "Sara", buildingId: "b1", roomId: "r1", rankKey: "lead" });
  store.agent.instantiate({ id: "a1", name: "Ada", buildingId: "b1", roomId: "r1", rankKey: "ic" });
  store.agent.assignSupervisor({ agentId: "a1", supervisorId: "sup1" });
  return store;
}

describe("tasks — test-gate lifecycle (Constitución VI)", () => {
  it("happy path: queued → running → under_review → succeeded (by supervisor)", () => {
    const store = seededStore();
    expect(store.task.assign({ id: "t1", title: "Ship feature", assigneeId: "a1", orderedById: "sup1" }).ok).toBe(true);
    expect(store.state().tasks[0]?.status).toBe("queued");
    expect(store.task.start({ taskId: "t1" }).ok).toBe(true);
    expect(store.state().tasks[0]?.status).toBe("running");
    expect(store.task.submit({ taskId: "t1" }).ok).toBe(true);
    expect(store.state().tasks[0]?.status).toBe("under_review");
    expect(store.task.evaluate({ taskId: "t1", evaluatorId: "sup1", verdict: "succeeded" }).ok).toBe(true);
    const t = store.state().tasks[0]!;
    expect(t.status).toBe("succeeded");
    expect(t.verdict).toBe("succeeded");
    expect(t.evaluatorId).toBe("sup1");
  });

  it("needs_revision returns the task to a startable state (loop)", () => {
    const store = seededStore();
    store.task.assign({ id: "t1", title: "X", assigneeId: "a1" });
    store.task.start({ taskId: "t1" });
    store.task.submit({ taskId: "t1" });
    store.task.evaluate({ taskId: "t1", evaluatorId: "sup1", verdict: "needs_revision" });
    expect(store.state().tasks[0]?.status).toBe("needs_revision");
    // can be restarted and resubmitted
    expect(store.task.start({ taskId: "t1" }).ok).toBe(true);
    expect(store.state().tasks[0]?.status).toBe("running");
  });

  it("only the direct supervisor can evaluate", () => {
    const store = seededStore();
    store.agent.instantiate({ id: "other", name: "Otto", buildingId: "b1", roomId: "r1", rankKey: "lead" });
    store.task.assign({ id: "t1", title: "X", assigneeId: "a1" });
    store.task.start({ taskId: "t1" });
    store.task.submit({ taskId: "t1" });
    expect(store.task.evaluate({ taskId: "t1", evaluatorId: "other", verdict: "succeeded" }))
      .toEqual({ ok: false, reason: "not_supervisor" });
    expect(store.state().tasks[0]?.status).toBe("under_review");
  });

  it("rejects invalid transitions and unknown entities", () => {
    const store = seededStore();
    expect(store.task.assign({ id: "t1", title: "X", assigneeId: "ghost" })).toEqual({ ok: false, reason: "assignee_not_found" });
    expect(store.task.start({ taskId: "nope" })).toEqual({ ok: false, reason: "task_not_found" });
    store.task.assign({ id: "t1", title: "X", assigneeId: "a1" });
    // cannot submit before running
    expect(store.task.submit({ taskId: "t1" })).toEqual({ ok: false, reason: "invalid_transition" });
    // cannot evaluate before under_review
    expect(store.task.evaluate({ taskId: "t1", evaluatorId: "sup1", verdict: "succeeded" })).toEqual({ ok: false, reason: "invalid_transition" });
    // duplicate id
    expect(store.task.assign({ id: "t1", title: "again", assigneeId: "a1" })).toEqual({ ok: false, reason: "duplicate_id" });
  });

  it("evaluate rejects unknown evaluator", () => {
    const store = seededStore();
    store.task.assign({ id: "t1", title: "X", assigneeId: "a1" });
    store.task.start({ taskId: "t1" });
    store.task.submit({ taskId: "t1" });
    expect(store.task.evaluate({ taskId: "t1", evaluatorId: "ghost", verdict: "succeeded" }))
      .toEqual({ ok: false, reason: "evaluator_not_found" });
  });
});
