/**
 * Tests for appearance set on buildings, rooms, agents.
 */

import { buildCampus, buildSkin, buildBuilding, buildRoom, buildAgent, type CampusCommand } from "../src";
import { reduce } from "../src/domain/reduce";
import { execute } from "../src/domain/commands";
import { EMPTY_STATE } from "../src/domain/types";

import { describe, it, expect } from "vitest";

describe("appearance.set commands", () => {
  it("sets building appearance (skinKey + xy)", () => {
    const state = reduce(
      reduce(
        reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
        { type: "skin.registered" as const, skin: buildSkin({ id: "s-1", kind: "building", key: "office", name: "Office" }) }
      ),
      { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ" }) }
    );
    const result = execute(state, {
      type: "building.setAppearance",
      buildingId: "b1",
      appearance: { skinKey: "office", x: 2, y: 3 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.type).toBe("building.appearance.set");
      expect(result.event.appearance).toEqual({ skinKey: "office", x: 2, y: 3 });
    }
  });

  it("merges partial appearance (set x without overwriting skinKey)", () => {
    const state = reduce(
      reduce(
        reduce(
          reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
          { type: "skin.registered" as const, skin: buildSkin({ id: "s-1", kind: "building", key: "office", name: "Office" }) }
        ),
        { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ", appearance: { skinKey: "office", x: 1 } }) }
      ),
      { type: "building.appearance.set" as const, buildingId: "b1", appearance: { y: 4 } }
    );
    const building = state.buildings.find((b) => b.id === "b1");
    expect(building).toBeDefined();
    expect(building?.appearance).toEqual({ skinKey: "office", x: 1, y: 4 });
  });

  it("rejects skin not found", () => {
    const state = reduce(
      reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
      { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ" }) }
    );
    const result = execute(state, {
      type: "building.setAppearance",
      buildingId: "b1",
      appearance: { skinKey: "office" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("skin_not_found");
  });

  it("rejects wrong kind (building command with room skin)", () => {
    const state = reduce(
      reduce(
        reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
        { type: "skin.registered" as const, skin: buildSkin({ id: "s-room", kind: "room", key: "lab", name: "Lab" }) }
      ),
      { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ" }) }
    );
    const result = execute(state, {
      type: "building.setAppearance",
      buildingId: "b1",
      appearance: { skinKey: "lab" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("skin_not_found");
  });

  it("room appearance similar logic", () => {
    const state = reduce(
      reduce(
        reduce(
          reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
          { type: "skin.registered" as const, skin: buildSkin({ id: "s-r", kind: "room", key: "office", name: "Office" }) }
        ),
        { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ" }) }
      ),
      { type: "room.spawned" as const, room: buildRoom({ id: "r1", buildingId: "b1", key: "marketing" }) }
    );
    const result = execute(state, {
      type: "room.setAppearance",
      roomId: "r1",
      appearance: { skinKey: "office", x: 1, y: 0 },
    });
    expect(result.ok).toBe(true);
  });

  it("Agent appearance similar logic", () => {
    const state = reduce(
      reduce(
        reduce(
          reduce(
            reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
            { type: "skin.registered" as const, skin: buildSkin({ id: "s-a", kind: "agent", key: "staff", name: "Staff" }) }
          ),
          { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ" }) }
        ),
        { type: "room.spawned" as const, room: buildRoom({ id: "r1", buildingId: "b1", key: "marketing" }) }
      ),
      { type: "agent.instantiated" as const, agent: buildAgent({ id: "a1", name: "Alice", buildingId: "b1", roomId: "r1" }) }
    );
    const result = execute(state, {
      type: "agent.setAppearance",
      agentId: "a1",
      appearance: { skinKey: "staff", x: 2, y: 1 },
    });
    expect(result.ok).toBe(true);
  });

  it("rejection: entity not found", () => {
    const state = reduce(
      reduce(EMPTY_STATE, { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) }),
      { type: "building.spawned" as const, building: buildBuilding({ id: "b1", campusId: "c1", name: "HQ" }) }
    );
    const result1 = execute(state, { type: "building.setAppearance" as const, buildingId: "b999", appearance: {} });
    expect(result1.ok).toBe(false);
    if (!result1.ok) expect(result1.reason).toBe("building_not_found");

    const result2 = execute(state, { type: "room.setAppearance" as const, roomId: "r999", appearance: {} });
    expect(result2.ok).toBe(false);
    if (!result2.ok) expect(result2.reason).toBe("room_not_found");

    const result3 = execute(state, { type: "agent.setAppearance" as const, agentId: "a999", appearance: {} });
    expect(result3.ok).toBe(false);
    if (!result3.ok) expect(result3.reason).toBe("agent_not_found");
  });
});