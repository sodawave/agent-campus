/**
 * Campus library: docs → classifications → vector namespaces,
 * bound to agents by oficio (skill.key) across buildings.
 */

import type {
  AgentInstance,
  DocClassification,
  Id,
  LibraryDocument,
  Skill,
} from "./types";

/** Classifications an oficio may query (RAG namespaces). */
export function classificationsForSkill(
  classifications: DocClassification[],
  skillKey: string,
): DocClassification[] {
  return classifications.filter((c) => c.skillKeys.includes(skillKey));
}

export function classificationsForAgent(
  classifications: DocClassification[],
  agent: Pick<AgentInstance, "skill">,
): DocClassification[] {
  return classificationsForSkill(classifications, agent.skill.key);
}

/** All agent instances (any building) that share access to a classification. */
export function agentsForClassification(
  agents: AgentInstance[],
  classification: DocClassification,
): AgentInstance[] {
  const keys = new Set(classification.skillKeys);
  return agents.filter((a) => keys.has(a.skill.key));
}

/** Vector namespaces the harness should search for this oficio. */
export function vectorNamespacesForSkill(
  classifications: DocClassification[],
  skillKey: string,
): string[] {
  return classificationsForSkill(classifications, skillKey).map(
    (c) => c.vectorNamespace,
  );
}

export function documentsInClassification(
  documents: LibraryDocument[],
  classificationId: Id,
): LibraryDocument[] {
  return documents.filter((d) =>
    d.classificationIds.includes(classificationId),
  );
}

/**
 * Bind / unbind an oficio to a classification.
 * Association is by skill key — not by instance — so same craft
 * in different buildings stays in sync.
 */
export function bindSkillToClassification(
  classification: DocClassification,
  skillKey: string,
): DocClassification {
  if (classification.skillKeys.includes(skillKey)) return classification;
  return {
    ...classification,
    skillKeys: [...classification.skillKeys, skillKey],
  };
}

export function unbindSkillFromClassification(
  classification: DocClassification,
  skillKey: string,
): DocClassification {
  return {
    ...classification,
    skillKeys: classification.skillKeys.filter((k) => k !== skillKey),
  };
}

export function skillKeyOf(skill: Skill): string {
  return skill.key;
}
