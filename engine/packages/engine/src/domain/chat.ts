/**
 * Chat helpers (pure). Messages form a per-agent thread (user <-> agent).
 */

import type { ChatMessage, State } from "./types";

/** The chat thread for a named agent, in insertion order. */
export function messagesForAgent(state: State, agentId: string): ChatMessage[] {
  return state.messages.filter((m) => m.agentId === agentId);
}
