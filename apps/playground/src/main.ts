import "./style.css";
import { bootstrap, onChange, ui } from "./app";
import { h } from "./util";
import { createGamification } from "./screens/gamification";
import { createOrg } from "./screens/org";
import { createChats } from "./screens/chats";

type ScreenId = "gamification" | "org_tasks" | "chats";

const TABS: { id: ScreenId; label: string }[] = [
  { id: "gamification", label: "Gamification" },
  { id: "org_tasks", label: "Org & Tasks" },
  { id: "chats", label: "Chats" },
];

function main(): void {
  bootstrap();

  const app = document.getElementById("app")!;

  const screens = {
    gamification: createGamification(),
    org_tasks: createOrg(),
    chats: createChats(),
  } as const;

  const tabEls = new Map<ScreenId, HTMLButtonElement>();

  const setScreen = (id: ScreenId) => {
    ui.screen = id;
    for (const [sid, s] of Object.entries(screens)) {
      s.root.classList.toggle("active", sid === id);
    }
    for (const [sid, btn] of tabEls) {
      btn.classList.toggle("active", sid === id);
    }
    screens[id].render();
  };

  const tabs = h(
    "div",
    { class: "tabs" },
    TABS.map((t) => {
      const btn = h(
        "button",
        { class: "tab", onclick: () => setScreen(t.id) },
        [t.label],
      );
      tabEls.set(t.id, btn);
      return btn;
    }),
  );

  const topbar = h("div", { class: "topbar" }, [
    h("div", { class: "brand" }, [
      h("h1", {}, ["Agent Campus"]),
      h("span", { class: "badge" }, ["v0.9"]),
      h("span", { class: "sub" }, ["playground"]),
    ]),
    tabs,
  ]);

  app.append(
    topbar,
    screens.gamification.root,
    screens.org_tasks.root,
    screens.chats.root,
  );

  // Re-render the active screen whenever state changes.
  onChange(() => screens[ui.screen].render());

  setScreen("gamification");
}

main();
