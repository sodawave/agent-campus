import { describe, expect, it } from "vitest";

import {
  acceptProjectCall,
  buildAgentInstance,
  canLeaveHomeOffice,
  isStationedAtHome,
  issueProjectCall,
  resolveEffectiveContext,
  returnHomeFromCall,
} from "../src/domain/context";
import {
  sampleCatalog,
  sampleClassifications,
  sampleProject,
  sampleWorkspaces,
} from "../src/samples";
import type { AgentArchetype, Project, Workspace } from "../src/domain/types";

function archetype(id: string): AgentArchetype {
  const a = sampleCatalog.find((x) => x.id === id);
  if (!a) throw new Error(`missing archetype ${id}`);
  return a;
}

describe("home office + project calls (TECH_SPEC §2, acceptance §5)", () => {
  it("named agents are stationed at their home office after instantiation", () => {
    const eng = buildAgentInstance({
      id: "eng-1",
      archetype: archetype("arch-systems-eng"),
      project: sampleProject,
      workspaces: sampleWorkspaces,
      name: "Ada",
    });

    // home department "dev" -> ws-dev
    expect(eng.homeWorkspaceId).toBe("ws-dev");
    expect(eng.workspaceId).toBe("ws-dev");
    // With no active call the agent sits at home.
    expect(canLeaveHomeOffice(eng)).toBe(false);
    const homed = { ...eng, introducing: false };
    expect(isStationedAtHome(homed)).toBe(true);
  });

  it("a ProjectCall authorizes moving to the corresponding office, then returning home", () => {
    const eng = buildAgentInstance({
      id: "eng-1",
      archetype: archetype("arch-systems-eng"),
      project: sampleProject,
      workspaces: sampleWorkspaces,
      name: "Ada",
    });

    const destination: Project = { ...sampleProject, id: "proj-beta" };
    const destWorkspaces: Workspace[] = sampleWorkspaces.map((w) => ({
      ...w,
      id: `${w.id}-beta`,
      projectId: "proj-beta",
    }));

    const call = issueProjectCall({
      id: "call-1",
      fromProjectId: "proj-beta",
      agent: eng,
      reason: "need infra help",
    });
    expect(call.status).toBe("pending");

    const moved = acceptProjectCall(eng, call, destination, destWorkspaces);
    expect(moved.activeCallId).toBe("call-1");
    expect(moved.projectId).toBe("proj-beta");
    expect(moved.workspaceId).toBe("ws-dev-beta"); // corresponding office
    expect(canLeaveHomeOffice(moved)).toBe(true);
    expect(isStationedAtHome(moved)).toBe(false);

    const home = returnHomeFromCall(moved);
    expect(home.activeCallId).toBeNull();
    expect(home.projectId).toBe(sampleProject.id);
    expect(home.workspaceId).toBe("ws-dev");
  });

  it("resolves effective context: craft + building + corresponding office + RAG classifications", () => {
    const eng = buildAgentInstance({
      id: "eng-1",
      archetype: archetype("arch-systems-eng"),
      project: sampleProject,
      workspaces: sampleWorkspaces,
      name: "Ada",
    });

    const ctx = resolveEffectiveContext(
      eng,
      sampleProject,
      sampleWorkspaces,
      sampleClassifications,
    );

    expect(ctx.craft.key).toBe("systems-engineering");
    expect(ctx.building.product).toBe("Agent Campus");
    expect(ctx.department?.title).toBe("Engineering");
    // systems-engineering is bound to eng-codebase + legal-eu classifications.
    const nsKeys = ctx.libraryClassifications.map((c) => c.key).sort();
    expect(nsKeys).toEqual(["eng-codebase", "legal-eu"]);
  });
});
