/**
 * Task inventory + orders (ops mindmap surface).
 */

import type { AgentOrder, AgentTask, Id, RunStatus } from "./types";

export function tasksForAgent(
  tasks: AgentTask[],
  agentId: Id,
): AgentTask[] {
  return tasks.filter((t) => t.agentId === agentId);
}

export function createTask(input: {
  id: Id;
  agentId: Id;
  title: string;
  orderedById?: Id;
  runId?: Id;
  status?: RunStatus;
  now?: string;
}): AgentTask {
  return {
    id: input.id,
    agentId: input.agentId,
    title: input.title,
    status: input.status ?? "queued",
    runId: input.runId,
    orderedById: input.orderedById,
    createdAt: input.now ?? new Date().toISOString(),
  };
}

export function issueOrder(input: {
  id: Id;
  toAgentId: Id;
  fromActorId: Id;
  fromKind: "human" | "agent";
  instruction: string;
  taskId?: Id;
  now?: string;
}): AgentOrder {
  return {
    id: input.id,
    toAgentId: input.toAgentId,
    fromActorId: input.fromActorId,
    fromKind: input.fromKind,
    instruction: input.instruction,
    taskId: input.taskId,
    status: "pending",
    createdAt: input.now ?? new Date().toISOString(),
  };
}

/** Order from another agent must follow org.canCommunicate (caller enforces). */
export function orderCreatesTask(
  order: AgentOrder,
  taskId: Id,
): AgentTask {
  return createTask({
    id: taskId,
    agentId: order.toAgentId,
    title: order.instruction,
    orderedById: order.fromActorId,
    status: "queued",
    now: order.createdAt,
  });
}
