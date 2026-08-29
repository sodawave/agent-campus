/**
 * GraphQL surface over the campus core (Control Panel foundation).
 * Schema + resolvers backed by a CampusLink (read state + send commands).
 * The resolver layer is testable in-memory via `executeGraphql` (no HTTP).
 */

import { buildSchema, graphql, type ExecutionResult } from "graphql";
import type { CommandResult } from "@agent-campus/campus-engine";
import type { CampusLink } from "./link";

export const schema = buildSchema(`
  type Provider { id: ID!, name: String!, models: [String!]!, hasToken: Boolean! }
  type ModelRef { providerId: ID!, model: String! }
  type Config {
    language: String!
    timezone: String!
    providers: [Provider!]!
    defaultModel: ModelRef
  }
  type Building { id: ID!, name: String!, leaderAgentId: ID }
  type Agent { id: ID!, name: String!, rankKey: String, live: Boolean! }
  type Project { id: ID!, name: String!, buildingId: ID!, status: String! }
  type Campus {
    id: ID
    name: String
    config: Config!
    buildings: [Building!]!
    agents: [Agent!]!
    projects: [Project!]!
  }
  type CommandResult { ok: Boolean!, reason: String, event: String }

  type Query { campus: Campus! }

  type Mutation {
    setConfig(language: String, timezone: String): CommandResult!
    spawnBuilding(id: ID!, name: String!): CommandResult!
    createProject(id: ID!, buildingId: ID!, name: String!): CommandResult!
    addProvider(id: ID!, name: String!, models: [String!]!): CommandResult!
    removeProvider(providerId: ID!): CommandResult!
    setDefaultModel(providerId: ID!, model: String!): CommandResult!
    setProviderToken(providerId: ID!, token: String!): CommandResult!
  }
`);

function toResult(r: CommandResult): { ok: boolean; reason?: string; event?: string } {
  return r.ok ? { ok: true, event: r.event.type } : { ok: false, reason: r.reason };
}

/**
 * Server-side secret store for provider tokens (keyed by providerId). Tokens are
 * secrets: they are kept here (server memory), never in the campus state / log.
 */
export type SecretStore = Map<string, string>;

/** Root resolvers closing over a CampusLink and a token secret store. */
export function createRoot(link: CampusLink, secrets: SecretStore = new Map()) {
  return {
    campus: () => {
      const s = link.state();
      return {
        id: s.campus?.id ?? null,
        name: s.campus?.name ?? null,
        config: {
          ...s.config,
          providers: s.config.providers.map((p) => ({
            id: p.id,
            name: p.name,
            models: p.models,
            hasToken: p.hasToken ?? false,
          })),
        },
        buildings: s.buildings.map((b) => ({ id: b.id, name: b.name, leaderAgentId: b.leaderAgentId ?? null })),
        agents: s.agents.map((a) => ({ id: a.id, name: a.name, rankKey: a.rankKey ?? null, live: a.runtimeId != null })),
        projects: s.projects.map((p) => ({ id: p.id, name: p.name, buildingId: p.buildingId, status: p.status })),
      };
    },
    setConfig: async (args: { language?: string; timezone?: string }) =>
      toResult(
        await link.send({
          type: "campus.setConfig",
          ...(args.language !== undefined ? { language: args.language } : {}),
          ...(args.timezone !== undefined ? { timezone: args.timezone } : {}),
        }),
      ),
    spawnBuilding: async (args: { id: string; name: string }) => {
      const campusId = link.state().campus?.id ?? "";
      return toResult(await link.send({ type: "building.spawn", building: { id: args.id, campusId, name: args.name } }));
    },
    createProject: async (args: { id: string; buildingId: string; name: string }) =>
      toResult(
        await link.send({ type: "project.create", project: { id: args.id, buildingId: args.buildingId, name: args.name, status: "active" } }),
      ),
    addProvider: async (args: { id: string; name: string; models: string[] }) =>
      toResult(await link.send({ type: "campus.addProvider", provider: { id: args.id, name: args.name, models: args.models } })),
    removeProvider: async (args: { providerId: string }) =>
      toResult(await link.send({ type: "campus.removeProvider", providerId: args.providerId })),
    setDefaultModel: async (args: { providerId: string; model: string }) =>
      toResult(await link.send({ type: "campus.setDefaultModel", providerId: args.providerId, model: args.model })),
    setProviderToken: async (args: { providerId: string; token: string }) => {
      const hasToken = args.token.length > 0;
      // Keep the raw token in the server secret store (never in the campus state).
      if (hasToken) secrets.set(args.providerId, args.token);
      else secrets.delete(args.providerId);
      const r = await link.send({ type: "campus.setProviderToken", providerId: args.providerId, hasToken });
      // Roll back the secret store if the core rejected the change.
      if (!r.ok) {
        if (hasToken) secrets.delete(args.providerId);
      }
      return toResult(r);
    },
  };
}

export function executeGraphql(
  link: CampusLink,
  source: string,
  variableValues?: Record<string, unknown>,
  secrets?: SecretStore,
): Promise<ExecutionResult> {
  return graphql({ schema, source, rootValue: createRoot(link, secrets), variableValues });
}
