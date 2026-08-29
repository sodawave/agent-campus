import { CampusCore, sampleDataset } from "@agent-campus/campus-engine";

/** A demo core seeded through the Command contract (dogfooding). */
export function createSeededCore(): CampusCore {
  const core = new CampusCore();
  core.load({
    campus: sampleDataset.campus,
    project: sampleDataset.project,
    workspaces: sampleDataset.workspaces,
    catalog: sampleDataset.catalog,
    library: sampleDataset.library,
    classifications: sampleDataset.classifications,
    documents: sampleDataset.documents,
  });

  const project = sampleDataset.project.id;
  core.execute({
    type: "agent.spawn",
    request: { projectId: project, archetypeId: "arch-dept-head", name: "Nadia Ortiz" },
  });
  core.execute({
    type: "agent.spawn",
    request: { projectId: project, archetypeId: "arch-systems-eng", name: "Ada Rivera" },
  });
  core.execute({
    type: "agent.spawn",
    request: { projectId: project, archetypeId: "arch-marketer", name: "Mia Chen" },
  });

  core.execute({ type: "host.join", label: "laptop-ana" });
  const host = core.state().hosts[0];
  const ada = core.state().agents.find((a) => a.skill.key === "systems-engineering");
  if (host && ada) {
    core.execute({
      type: "host.spawnRuntime",
      hostId: host.id,
      agentId: ada.id,
      workingDir: "/home/ana/agent-campus",
    });
  }

  return core;
}
