/**
 * Spec-Driven Development helpers at project level.
 * Toolkit: https://github.com/github/spec-kit
 */

import type {
  Id,
  Project,
  ProjectSpecKit,
  SpecKitArtifact,
  SpecKitArtifactKind,
  SpecKitPhase,
} from "./types";
import { DEFAULT_PROJECT_SPEC_KIT } from "./types";

export type {
  ProjectSpecKit,
  SpecKitArtifact,
  SpecKitArtifactKind,
  SpecKitPhase,
};
export { DEFAULT_PROJECT_SPEC_KIT };

export function initProjectSpecKit(
  overrides?: Partial<ProjectSpecKit>,
): ProjectSpecKit {
  return { ...DEFAULT_PROJECT_SPEC_KIT, ...overrides };
}

export function nextSpecKitPhase(phase: SpecKitPhase): SpecKitPhase {
  const order: SpecKitPhase[] = [
    "constitution",
    "specify",
    "plan",
    "tasks",
    "implement",
    "converge",
  ];
  const i = order.indexOf(phase);
  if (i < 0 || i >= order.length - 1) return "converge";
  return order[i + 1]!;
}

export function projectHasSpecKit(project: Project): boolean {
  return project.specKit?.enabled === true;
}

export function createSpecKitArtifact(input: {
  id: Id;
  projectId: Id;
  kind: SpecKitArtifactKind;
  title: string;
  uri: string;
  slug?: string;
  authorAgentId?: Id;
  now?: string;
}): SpecKitArtifact {
  return {
    id: input.id,
    projectId: input.projectId,
    kind: input.kind,
    title: input.title,
    slug: input.slug,
    uri: input.uri,
    status: "draft",
    updatedAt: input.now ?? new Date().toISOString(),
    authorAgentId: input.authorAgentId,
  };
}
