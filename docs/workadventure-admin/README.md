# WorkAdventure Admin docs — index for Agent Campus Control Panel

Canonical online: [https://docs.workadventu.re/admin/](https://docs.workadventu.re/admin/)

This folder mirrors the SaaS **administration dashboard** concepts so we can evolve [`apps/control-panel`](../../apps/control-panel) without relying on the browser alone. Local WA Open Source clone does **not** ship this SaaS admin UI; for self-host see [admin-api-self-host.md](./admin-api-self-host.md) (Pusher → your Admin API).

## Pages indexed

| Page | URL |
|------|-----|
| Dashboard overview | https://docs.workadventu.re/admin/ |
| Managing access | https://docs.workadventu.re/admin/manage-access/ |
| Members | https://docs.workadventu.re/admin/members/ |
| Chat / Matrix config | https://docs.workadventu.re/admin/chat/ |
| Self-host admin panel | https://docs.workadventu.re/admin/admin-self-hosting/ |
| Implement own Admin API | [admin-api-self-host.md](./admin-api-self-host.md) (from vendor docs) |

---

## Vocabulary (WA)

- **Room** — virtual place users connect; entries/exits; created from maps.
- **Map** — JSON universe (can be hosted anywhere); multiple rooms can share a map.
- **WAM** — room furniture/edits from inline editor.
- **World** — group of rooms; access/members at this level.
- **Organization** — top entity; contains worlds; admins tied here.
- **Woka** — avatar; configurable per world.

Typical: 1 org → 1 world. Multi-world useful for events (1 world = 1 event, 1 member = 1 attendee).

## User types

1. **Anonymous** — no auth; limited (no DM / Matrix rooms); harder to moderate (IP / session id).
2. **Visitor** — self-register / social login; chat OK; no tags; list not in dashboard yet (GDPR).
3. **Member** — admin-added; tags; autologin URL or login screen; Premium for SaaS member mgmt.
4. **Dashboard administrator** — manages worlds/members/rooms; org-scoped; promote via “owner access” on member.

## World dashboard tabs

- Rooms list
- Members (invite / edit / tags / CSV batch / export)
- Users (realtime connected)
- Banned users
- Reports
- Wokas

## Room access types

- Public (link)
- Members only
- Members only **with tags**

Free SaaS: public rooms only.

## Members (Premium SaaS; not self-host dashboard)

- Fields: name, email, contact, tags (free strings e.g. staff/speakers/attendees)
- Batch CSV: `email, name, token?, tags?` (tags `;`-separated; no header today)
- Export: name, email, member id, **autologin URL**
- Business cards: enable/disable + which fields show (Free+)

## Chat world settings (Premium SaaS)

- Enable/disable Matrix chat rooms (bubbles stay)
- Online / disconnected user lists
- File upload in chat
- Custom Matrix server URL + SSO IdP (same OIDC as world) — also available self-host BYO Matrix

## Self-host admin panel

SaaS admin UI is **not** in OSS by default. Enterprise self-host admin = Helm charts (admin + members site + WA + Matrix). Contact WorkAdventure. Charts: https://charts.workadventu.re

## Self-host Admin API (relevant to us)

Pusher calls **your** Admin API (not the reverse):

- `GET /api/map` → MapDetailsData
- `GET /api/room/access` → FetchMemberDataByUuidResponse
- `GET /api/woka/list` → WokaList
- Full surface: WA Play swagger; auth via `ADMIN_API_URL` + `ADMIN_API_TOKEN`

See [admin-api-self-host.md](./admin-api-self-host.md).

---

## Gap analysis → `apps/control-panel`

Current control panel ([TECH_SPEC §15.2](../TECH_SPEC.md)): campus GraphQL — language, timezone, providers/models, overview of buildings/agents/projects.

| WA admin capability | Campus analogue / next step |
|---------------------|----------------------------|
| Organization / World | Campus (+ multi-campus later) |
| Rooms list + access types | Buildings / rooms + access policy (tags?) |
| Members + tags + invite/CSV | Named humans vs agents; tags ↔ roles/ranks |
| Live users / banned / reports | WA bridge sessions + moderation Commands |
| Wokas catalog | Agent/appearance skins |
| Auth: anon / visitor / member | OIDC + connection token (deferred) |
| Chat / Matrix settings | Campus chat + optional Matrix |
| Admin API for WA pusher | Optional: campus implements WA Admin API so self-host WA uses campus as authority |

**Priority for control-panel updates (suggested):**

1. Surface **campus / buildings / rooms / agents** closer to WA “world dashboard” tabs (read-only first).
2. Design **members/tags** only if humans enter WA authenticated (beyond anonymLogin agents).
3. If WA stays self-host OSS: plan **Admin API** adapter in campus/server rather than SaaS dashboard clone.
4. Keep AI providers/config as campus-specific (not in WA admin docs).
