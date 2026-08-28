import {
  canCommunicate,
  type AgentInstance,
} from "@agent-campus/campus-engine";
import { store } from "../app";
import { clear, colorFromString, h, initials } from "../util";

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
    const state = store.getState();
    const agents = state.agents;
    const roots = agents.filter(
      (a) => !a.supervisorId || !agents.some((x) => x.id === a.supervisorId),
    );

    // Org chart
    const chart = h("div", { class: "org" }, [
      h(
        "ul",
        {},
        roots.map((r) => node(r, agents)),
      ),
    ]);
    main.append(
      h("div", { class: "panel" }, [
        h("h2", {}, ["Organigram (supervisor edges)"]),
        agents.length
          ? chart
          : h("div", { class: "empty" }, ["No agents yet."]),
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
          const check =
            state.project &&
            canCommunicate(state.project, agents, from, to);
          if (!check || !check.ok) {
            status.textContent = `Rejected: ${
              check && !check.ok ? check.reason : "no_project"
            }`;
            status.style.color = "var(--danger)";
            return;
          }
          store.issueOrder({
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
