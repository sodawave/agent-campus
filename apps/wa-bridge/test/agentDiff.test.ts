import { describe, expect, it } from "vitest";
import { agentsToJoin } from "../src/agentDiff";
import type { AgentRef } from "../src/types";

function agent(partial: Partial<AgentRef> & Pick<AgentRef, "id" | "name">): AgentRef {
  return {
    kind: "named",
    buildingId: "b1",
    roomId: "r1",
    ...partial,
  };
}

describe("agentsToJoin", () => {
  it("returns named agents not yet joined", () => {
    const agents = [
      agent({ id: "a-mia", name: "Mia" }),
      agent({ id: "a-ivan", name: "Ivan" }),
    ];
    expect(agentsToJoin(agents, new Set(["a-mia"]))).toEqual([
      agent({ id: "a-ivan", name: "Ivan" }),
    ]);
  });

  it("skips anonymous workers", () => {
    const agents = [
      agent({ id: "a-mia", name: "Mia" }),
      agent({ id: "w-1", name: "worker", kind: "anonymous_worker" }),
    ];
    expect(agentsToJoin(agents, new Set())).toEqual([agent({ id: "a-mia", name: "Mia" })]);
  });

  it("returns empty when all named agents are already joined", () => {
    const agents = [agent({ id: "a-mia", name: "Mia" })];
    expect(agentsToJoin(agents, new Set(["a-mia"]))).toEqual([]);
  });
});
