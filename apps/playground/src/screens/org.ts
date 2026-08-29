import {
  canCommunicate,
  type AgentInstance,
  type SpecKitArtifactKind,
  type SpecKitPhase,
} from "@agent-campus/campus-engine";
import { activeBuilding, store } from "../app";
import { clear, colorFromString, h, initials } from "../util";

const SPEC_PHASES: SpecKitPhase[] = [
  "constitution",
  "specify",
  "plan",
  "tasks",
  "implement",
  "converge",
];

const SPEC_ARTIFACT_KINDS: SpecKitArtifactKind[] = [
  "constitution",
  "spec",
  "plan",
  "tasks",
  "convergence_report",
];

function node(agent: AgentInstance, all: AgentInstance[]): HTMLElement {
  const children = all.filter((a) => a.supervisorId === agent.id);
  const dot = h("span", {
    class: "dot",
    style: `background:${
      agent.kind === "anonymous_worker" ? "#7ee787" : colorFromString(agent.name)
    }`,
  });
  dot.textContent =
    agent.kind === "anonymous_worker" ? "•" : initials(agent.name);

  const nodeEl = h("span", { class: "node" }, [
    dot,
    h("span", {}, [agent.name]),
    h("span", { class: "chip rank" }, [agent.rankKey]),
  ]);

  const li = h("li", {}, [nodeEl]);
  if (children.length) {
    li.append(
      h(
        "ul",
        {},
        children.map((c) => node(c, all)),
      ),
    );
  }
  return li;
}

export function createOrg(): { root: HTMLElement; render: () => void } {
  const main = h("div", { class: "main" });
  const sidebar = h("div", { class: "sidebar" });
  const root = h("div", { class: "screen", dataset: { screen: "org_tasks" } }, [
    main,
    sidebar,
  ]);

  const render = () => {
    clear(main);
    clear(sidebar);
    const b = activeBuilding();
    const agents = b ? store.agentsInBuilding(b.id) : [];
    const roots = agents.filter(
      (a) => !a.supervisorId || !agents.some((x) => x.id === a.supervisorId),
    );

    // Org chart (scoped to the active building)
    const chart = h("div", { class: "org" }, [
      h(
        "ul",
        {},
        roots.map((r) => node(r, agents)),
      ),
    ]);
    main.append(
      h("div", { class: "panel" }, [
        h("h2", {}, [`Organigram — ${b?.name ?? "—"} (supervisor edges)`]),
        agents.length
          ? chart
          : h("div", { class: "empty" }, ["No agents in this building yet."]),
      ]),
    );

    // Task inventory
    const taskPanels = agents
      .filter((a) => store.tasksForAgent(a.id).length > 0)
      .map((a) =>
        h("div", { style: "margin-bottom:12px" }, [
          h("div", { class: "agent-meta" }, [
            h("span", { class: "name" }, [a.name]),
          ]),
          ...store.tasksForAgent(a.id).map((t) =>
            h("div", { class: "task" }, [
              h("span", { class: `status ${t.status}` }, [t.status]),
              h("span", {}, [t.title]),
            ]),
          ),
        ]),
      );
    main.append(
      h("div", { class: "panel" }, [
        h("h2", {}, ["Task inventory"]),
        taskPanels.length
          ? h("div", {}, taskPanels)
          : h("div", { class: "empty" }, ["No tasks yet."]),
      ]),
    );

    // Spec Kit (SDD) — per building
    if (b) main.append(specKitPanel(b.id));

    // Issue order (enforced by org.canCommunicate)
    const fromSel = h(
      "select",
      {},
      agents.map((a) => h("option", { value: a.id }, [`${a.name} (${a.rankKey})`])),
    );
    const toSel = h(
      "select",
      {},
      agents.map((a) => h("option", { value: a.id }, [`${a.name} (${a.rankKey})`])),
    );
    const instr = document.createElement("textarea");
    instr.placeholder = "Instruction…";
    const status = h("p", { class: "hint" }, [
      "Orders must follow the reporting line (peers or direct supervisor/report).",
    ]);

    const issue = h(
      "button",
      {
        class: "btn primary",
        onclick: () => {
          const from = fromSel.value;
          const to = toSel.value;
          const check = b && canCommunicate(b, agents, from, to);
          if (!check || !check.ok) {
            status.textContent = `Rejected: ${
              check && !check.ok ? check.reason : "no_building"
            }`;
            status.style.color = "var(--danger)";
            return;
          }
          store.agent.order({
            toAgentId: to,
            fromActorId: from,
            fromKind: "agent",
            instruction: instr.value.trim() || "(no instruction)",
          });
          status.textContent = "Order issued → task created.";
          status.style.color = "var(--accent-2)";
          instr.value = "";
        },
      },
      ["Issue order"],
    );

    sidebar.append(
      h("div", { class: "panel" }, [
        h("h2", {}, ["Issue order"]),
        h("label", { class: "field" }, ["From"]),
        fromSel,
        h("label", { class: "field" }, ["To"]),
        toSel,
        h("label", { class: "field" }, ["Instruction"]),
        instr,
        h("div", { class: "row", style: "margin-top:10px" }, [issue]),
        status,
      ]),
    );
  };

  render();
  return { root, render };
}

/** Spec Kit (SDD) panel for one building. */
function specKitPanel(buildingId: string): HTMLElement {
  const sk = store.specKitOf(buildingId);

  if (!sk) {
    return h("div", { class: "panel" }, [
      h("h2", {}, ["Spec Kit (SDD)"]),
      h("p", { class: "hint" }, [
        "Spec-Driven Development per building. Not enabled yet.",
      ]),
      h(
        "button",
        {
          class: "btn primary",
          onclick: () => store.building.specKit.enable(buildingId),
        },
        ["Enable Spec Kit"],
      ),
    ]);
  }

  // Phase stepper
  const stepper = h(
    "div",
    { class: "row tight", style: "flex-wrap:wrap" },
    SPEC_PHASES.flatMap((p, i) => {
      const chip = h(
        "span",
        { class: `chip${p === sk.phase ? " rank" : ""}` },
        [p],
      );
      return i < SPEC_PHASES.length - 1
        ? [chip, h("span", { class: "hint", style: "margin:0 2px" }, ["→"])]
        : [chip];
    }),
  );

  const convClass =
    sk.convergence === "converged"
      ? "succeeded"
      : sk.convergence === "in_progress"
        ? "running"
        : "queued";
  const advance = h(
    "button",
    {
      class: "btn",
      disabled: sk.phase === "converge",
      onclick: () => store.building.specKit.advancePhase(buildingId),
    },
    ["Advance phase"],
  );

  // Artifacts
  const artifacts = store.specArtifactsOf(buildingId);
  const artifactRows = artifacts.length
    ? artifacts.map((a) =>
        h("div", { class: "task" }, [
          h("span", { class: "chip" }, [a.kind]),
          h("span", {}, [a.title]),
          h("span", { class: "status queued", style: "margin-left:auto" }, [
            a.status,
          ]),
        ]),
      )
    : [h("div", { class: "empty" }, ["No artifacts yet."])];

  // Add-artifact form
  const kindSel = h(
    "select",
    {},
    SPEC_ARTIFACT_KINDS.map((k) => h("option", { value: k }, [k])),
  );
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Artifact title";
  const uriInput = document.createElement("input");
  uriInput.type = "text";
  uriInput.placeholder = "uri (e.g. specs/mvp/spec.md)";
  const addBtn = h(
    "button",
    {
      class: "btn",
      onclick: () => {
        store.building.specKit.addArtifact({
          buildingId,
          kind: kindSel.value as SpecKitArtifactKind,
          title: titleInput.value.trim() || "Untitled",
          uri: uriInput.value.trim() || "specs/untitled.md",
        });
        titleInput.value = "";
        uriInput.value = "";
      },
    },
    ["Add artifact"],
  );

  return h("div", { class: "panel" }, [
    h("div", { class: "row", style: "justify-content:space-between" }, [
      h("h2", { style: "margin:0" }, ["Spec Kit (SDD)"]),
      h("span", { class: `status ${convClass}` }, [sk.convergence]),
    ]),
    h("div", { class: "row", style: "margin:8px 0" }, [stepper]),
    h("div", { class: "row" }, [advance]),
    sk.extensions.length
      ? h("p", { class: "hint" }, [`extensions: ${sk.extensions.join(", ")}`])
      : null,
    h("h2", { style: "margin-top:14px" }, ["Artifacts"]),
    h("div", {}, artifactRows),
    h("div", { class: "row", style: "margin-top:10px" }, [
      kindSel,
      titleInput,
      uriInput,
      addBtn,
    ]),
  ]);
}
