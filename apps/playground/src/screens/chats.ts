import { resolveEffectiveContext } from "@agent-campus/campus-engine";
import { store, ui, type ChatMessage } from "../app";
import { clear, colorFromString, h, initials } from "../util";

function reply(agentName: string, deptTitle: string | null, craft: string): string {
  const where = deptTitle ? `the ${deptTitle} office` : "my post";
  return `As a ${craft} working from ${where}, here's my take: I'll reason with my craft and this building's context. (${agentName})`;
}

export function createChats(): { root: HTMLElement; render: () => void } {
  const main = h("div", { class: "main" });
  const sidebar = h("div", { class: "sidebar" });
  const root = h("div", { class: "screen", dataset: { screen: "chats" } }, [
    sidebar,
    main,
  ]);

  const render = () => {
    clear(main);
    clear(sidebar);
    const state = store.getState();
    const named = store.namedAgents();

    // agent list
    sidebar.append(h("h2", { style: "color:var(--text-dim)" }, ["Agents"]));
    for (const a of named) {
      const dot = h("span", {
        class: "dot",
        style: `background:${colorFromString(a.name)}`,
      });
      dot.textContent = initials(a.name);
      sidebar.append(
        h(
          "div",
          {
            class: `agent-row${a.id === ui.chatAgentId ? " selected" : ""}`,
            onclick: () => {
              ui.chatAgentId = a.id;
              render();
            },
          },
          [
            dot,
            h("div", { class: "agent-meta" }, [
              h("span", { class: "name" }, [a.name]),
              h("span", { class: "tag" }, [`${a.skill.label} · ${a.rankKey}`]),
            ]),
          ],
        ),
      );
    }
    if (!named.length) {
      sidebar.append(h("div", { class: "empty" }, ["Hire agents first."]));
    }

    const agent = named.find((a) => a.id === ui.chatAgentId) ?? named[0] ?? null;
    if (!agent || !state.project) {
      main.append(h("div", { class: "empty" }, ["Select an agent to chat."]));
      return;
    }
    ui.chatAgentId = agent.id;

    const ctx = resolveEffectiveContext(
      agent,
      state.project,
      state.workspaces,
      state.classifications,
    );

    const header = h("div", { class: "chat-header" }, [
      h("div", { class: "row" }, [
        h("strong", {}, [agent.name]),
        h("span", { class: "chip rank" }, [ctx.rank.label]),
      ]),
      h("div", { class: "chat-context" }, [
        h("span", { class: "chip" }, [`craft: ${ctx.craft.key}`]),
        h("span", { class: "chip" }, [
          `building: ${ctx.building.product ?? "—"}`,
        ]),
        h("span", { class: "chip" }, [
          `dept: ${ctx.department?.title ?? "—"}`,
        ]),
        h("span", { class: "chip" }, [`model: ${ctx.harness.model}`]),
        ...ctx.libraryClassifications.map((c) =>
          h("span", { class: "chip worker" }, [`rag: ${c.vectorNamespace}`]),
        ),
      ]),
    ]);

    const thread = ui.chats.get(agent.id) ?? [];
    const messages = h(
      "div",
      { class: "messages" },
      thread.length
        ? thread.map((m: ChatMessage) =>
            h("div", { class: `msg ${m.who === "me" ? "me" : "them"}` }, [
              h("div", { class: "who" }, [
                m.who === "me" ? "You" : agent.name,
              ]),
              m.text,
            ]),
          )
        : [
            h("div", { class: "empty" }, [
              `Say hello to ${agent.name}. Replies are mocked (no LLM wired yet).`,
            ]),
          ],
    );

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Message ${agent.name.split(" ")[0]}…`;
    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      const list = ui.chats.get(agent.id) ?? [];
      list.push({ who: "me", text });
      list.push({
        who: "agent",
        text: reply(
          agent.name.split(" ")[0]!,
          ctx.department?.title ?? null,
          ctx.craft.label,
        ),
      });
      ui.chats.set(agent.id, list);
      input.value = "";
      render();
      messages.scrollTop = messages.scrollHeight;
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
    const composer = h("div", { class: "composer" }, [
      input,
      h("button", { class: "btn primary", onclick: send }, ["Send"]),
    ]);

    main.append(
      h("div", { class: "chat" }, [header, messages, composer]),
    );
  };

  render();
  return { root, render };
}
