/**
 * Tests for skins catalog registration and validation.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_STATE,
  buildCampus,
  buildSkin,
  reduce,
  reduceAll,
  execute,
  type CampusCommand,
  type RejectionReason,
  type SkinKind,
} from "../src/index";

describe("skin.register", () => {
  const validKinds: SkinKind[] = ["building", "room", "agent"];

  it("registers a valid skin", () => {
    const campusEvent = { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) };
    const state = reduce(EMPTY_STATE, campusEvent);

    const cmd: CampusCommand = {
      type: "skin.register",
      skin: buildSkin({
        id: "s-hq",
        kind: "building",
        key: "hq-office",
        name: "HQ Office",
        palette: { floor: "#1a1a2e", wall: "#16213e", header: "#0f3460", accent: "#e94560" },
        size: { w: 10, h: 8 },
      }),
    };
    const result = execute(state, cmd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.type).toBe("skin.registered");
      expect(result.event.skin.key).toBe("hq-office");
    }
  });

  it("rejects invalid kind", () => {
    const campusEvent = { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) };
    const state = reduce(EMPTY_STATE, campusEvent);

    const cmd: CampusCommand = {
      type: "skin.register",
      skin: buildSkin({
        id: "s-bad",
        kind: "invalid" as SkinKind,
        key: "bad",
        name: "Bad",
      }),
    };
    const result = execute(state, cmd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("skin_invalid_kind");
  });

  it("rejects duplicate id", () => {
    const skin = buildSkin({ id: "s-dup", kind: "building", key: "dup", name: "Dup" });
    const cmd: CampusCommand = {
      type: "skin.register",
      skin,
    };
    const campusEvent = { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) };
    const state1 = reduce(EMPTY_STATE, campusEvent);
    const result1 = execute(state1, cmd);
    expect(result1.ok).toBe(true);

    if (result1.ok) {
      const state2 = reduce(state1, result1.event);
      const result2 = execute(state2, cmd);
      expect(result2.ok).toBe(false);
      if (!result2.ok) expect(result2.reason).toBe("duplicate_id");
    }
  });

  it("rejects duplicate key per kind", () => {
    const campusEvent = { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) };
    const state = reduce(EMPTY_STATE, campusEvent);

    const cmd1: CampusCommand = {
      type: "skin.register",
      skin: buildSkin({ id: "s-a", kind: "building", key: "dup", name: "Dup A" }),
    };
    const result1 = execute(state, cmd1);
    expect(result1.ok).toBe(true);

    if (result1.ok) {
      const state2 = reduce(state, result1.event);
      const cmd2: CampusCommand = {
        type: "skin.register",
        skin: buildSkin({ id: "s-b", kind: "building", key: "dup", name: "Dup B" }),
      };
      const result2 = execute(state2, cmd2);
      expect(result2.ok).toBe(false);
      if (!result2.ok) expect(result2.reason).toBe("duplicate_key");
    }
  });

  it("allows same key for different kinds", () => {
    const campusEvent = { type: "campus.loaded" as const, campus: buildCampus({ id: "c1", name: "Test" }) };
    const state = reduce(EMPTY_STATE, campusEvent);

    const cmd1: CampusCommand = {
      type: "skin.register",
      skin: buildSkin({ id: "s-a", kind: "building", key: "dup", name: "Building Dup" }),
    };
    const result1 = execute(state, cmd1);
    expect(result1.ok).toBe(true);

    if (result1.ok) {
      const state2 = reduce(state, result1.event);
      const cmd2: CampusCommand = {
        type: "skin.register",
        skin: buildSkin({ id: "s-b", kind: "room", key: "dup", name: "Room Dup" }),
      };
      const result2 = execute(state2, cmd2);
      expect(result2.ok).toBe(true);
    }
  });
});