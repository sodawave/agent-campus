import { describe, expect, it } from "vitest";
import { CampusStore, projectsForBuilding } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Empresa A" });
  store.building.spawn({ id: "b2", name: "Empresa B" });
  return store;
}

describe("project.create (inventory of the building)", () => {
  it("creates a project inside a building (active)", () => {
    const store = seeded();
    const res = store.project.create({ id: "p1", buildingId: "b1", name: "Onboarding" });
    expect(res.ok).toBe(true);
    expect(store.state().projects.find((p) => p.id === "p1")).toMatchObject({ buildingId: "b1", name: "Onboarding", status: "active" });
  });

  it("projectsForBuilding returns only that building's projects (inventory)", () => {
    const store = seeded();
    store.project.create({ id: "p1", buildingId: "b1", name: "A1" });
    store.project.create({ id: "p2", buildingId: "b1", name: "A2" });
    store.project.create({ id: "p3", buildingId: "b2", name: "B1" });
    expect(projectsForBuilding(store.state(), "b1").map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(projectsForBuilding(store.state(), "b2").map((p) => p.id)).toEqual(["p3"]);
  });

  it("rejects unknown building and duplicate id", () => {
    const store = seeded();
    expect(store.project.create({ id: "p1", buildingId: "nope", name: "X" })).toEqual({ ok: false, reason: "building_not_found" });
    store.project.create({ id: "p1", buildingId: "b1", name: "X" });
    expect(store.project.create({ id: "p1", buildingId: "b1", name: "dup" })).toEqual({ ok: false, reason: "duplicate_id" });
  });
});

describe("project.archive", () => {
  it("archives a project", () => {
    const store = seeded();
    store.project.create({ id: "p1", buildingId: "b1", name: "A1" });
    expect(store.project.archive({ projectId: "p1" }).ok).toBe(true);
    expect(store.state().projects.find((p) => p.id === "p1")?.status).toBe("archived");
  });
  it("rejects an unknown project", () => {
    const store = seeded();
    expect(store.project.archive({ projectId: "nope" })).toEqual({ ok: false, reason: "project_not_found" });
  });
});
