/**
 * CampusStore — campus-scoped, entity-namespaced facade over the control plane.
 * Orchestrates: command -> execute (validate) -> reduce -> append to log -> notify.
 * Rejected commands do not mutate state nor grow the log; the reason is returned.
 */

import { buildAgent, buildBuilding, buildCampus, buildRoom, buildTask, buildWorker } from "../domain/builders";
import { execute, type CampusCommand, type CommandResult } from "../domain/commands";
import { reduce } from "../domain/reduce";
import { EMPTY_STATE, type CampusEvent, type Id, type State, type TaskVerdict } from "../domain/types";

type Listener = (state: State) => void;

export class CampusStore {
  #state: State = EMPTY_STATE;
  #log: CampusEvent[] = [];
  #listeners = new Set<Listener>();

  state(): State {
    return this.#state;
  }

  /** Sequence of accepted events (the canonical order). */
  log(): readonly CampusEvent[] {
    return this.#log;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this.#state);
  }

  /** Apply a raw command: validate, and on accept reduce + append + notify. */
  dispatch(command: CampusCommand): CommandResult {
    const result = execute(this.#state, command);
    if (!result.ok) return result;
    const next = reduce(this.#state, result.event);
    // Accepted no-op (e.g. idempotent reload) leaves state unchanged: skip log/notify.
    if (next !== this.#state) {
      this.#state = next;
      this.#log.push(result.event);
      this.#notify();
    }
    return result;
  }

  readonly campus = {
    load: (input: { id: Id; name: string; buildingIds?: Id[] }): CommandResult =>
      this.dispatch({ type: "campus.load", campus: buildCampus(input) }),
  };

  readonly building = {
    spawn: (input: { id: Id; name: string }): CommandResult =>
      this.dispatch({
        type: "building.spawn",
        building: buildBuilding({
          id: input.id,
          name: input.name,
          campusId: this.#state.campus?.id ?? "",
        }),
      }),
  };

  readonly room = {
    spawn: (input: { id: Id; buildingId: Id; key: string }): CommandResult =>
      this.dispatch({ type: "room.spawn", room: buildRoom(input) }),
    assignHead: (input: { roomId: Id; agentId: Id }): CommandResult =>
      this.dispatch({ type: "room.assignHead", roomId: input.roomId, agentId: input.agentId }),
  };

  readonly agent = {
    instantiate: (input: {
      id: Id;
      name: string;
      buildingId: Id;
      roomId: Id;
      rankKey?: string;
      skillKey?: string;
      supervisorId?: Id | null;
    }): CommandResult =>
      this.dispatch({ type: "agent.instantiate", agent: buildAgent(input) }),
    assignSupervisor: (input: { agentId: Id; supervisorId: Id | null }): CommandResult =>
      this.dispatch({
        type: "agent.assignSupervisor",
        agentId: input.agentId,
        supervisorId: input.supervisorId,
      }),
  };

  readonly worker = {
    spawn: (input: {
      id: Id;
      actorId: Id;
      buildingId: Id;
      roomId: Id;
      name?: string;
    }): CommandResult =>
      this.dispatch({
        type: "worker.spawn",
        actorId: input.actorId,
        worker: buildWorker({
          id: input.id,
          buildingId: input.buildingId,
          roomId: input.roomId,
          spawnedById: input.actorId,
          name: input.name,
        }),
      }),
    despawn: (input: { actorId: Id; workerId: Id }): CommandResult =>
      this.dispatch({ type: "worker.despawn", actorId: input.actorId, workerId: input.workerId }),
  };

  readonly task = {
    assign: (input: { id: Id; title: string; assigneeId: Id; orderedById?: Id }): CommandResult =>
      this.dispatch({ type: "task.assign", task: buildTask(input) }),
    start: (input: { taskId: Id }): CommandResult =>
      this.dispatch({ type: "task.start", taskId: input.taskId }),
    submit: (input: { taskId: Id }): CommandResult =>
      this.dispatch({ type: "task.submit", taskId: input.taskId }),
    evaluate: (input: { taskId: Id; evaluatorId: Id; verdict: TaskVerdict }): CommandResult =>
      this.dispatch({
        type: "task.evaluate",
        taskId: input.taskId,
        evaluatorId: input.evaluatorId,
        verdict: input.verdict,
      }),
  };
}
