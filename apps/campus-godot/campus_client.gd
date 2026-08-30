class_name CampusClient
extends RefCounted

## Minimal WebSocket client for the campus core (presentation plane, read-only).
##
## Reimplements — in GDScript, sharing no code with the TS engine — a *tolerant*
## reducer over the language-neutral `CampusEvent` JSON contract. It folds only
## the events needed to project the map (campus, buildings, rooms, agents);
## unknown events are ignored, exactly like the TS reducer.

signal changed

var has_campus := false
var campus_name := ""
var buildings: Array = []    # [{ id, name, leaderAgentId, appearance? }]
var rooms: Array = []        # [{ id, buildingId, key, role, headAgentId, appearance? }]
var agents: Array = []       # [{ id, name, buildingId, roomId, rankKey, skillKey, appearance? }]
var workers: Array = []      # [{ id, name, buildingId, roomId }] (anonymous, ephemeral)
var runtimes: Array = []     # [{ id, hostId, agentId, status }] (execution plane -> liveness)
var projects: Array = []     # [{ id, buildingId, name, status }]
var assignments: Array = []  # [{ agentId, projectId }]
var tasks: Array = []        # [{ id, title, assigneeId, status }]
var skins: Array = []        # [{ id, kind, key, name, assetUrl?, palette?, size? }]

var _ws := WebSocketPeer.new()
var _last_state := WebSocketPeer.STATE_CLOSED

func connect_to(url: String) -> void:
	_ws.connect_to_url(url)

func status() -> int:
	return _ws.get_ready_state()

## Pump the socket: must be called every frame. Drains all pending packets.
func poll() -> void:
	_ws.poll()
	var st := _ws.get_ready_state()
	if st != _last_state:
		_last_state = st
		changed.emit()
	while _ws.get_available_packet_count() > 0:
		var txt := _ws.get_packet().get_string_from_utf8()
		_on_message(txt)

func _on_message(txt: String) -> void:
	var msg = JSON.parse_string(txt)
	if typeof(msg) != TYPE_DICTIONARY:
		return
	match String(msg.get("type", "")):
		"snapshot":
			for ev in msg.get("log", []):
				_reduce(ev)
			changed.emit()
		"event":
			_reduce(msg.get("event", {}))
			changed.emit()
		_:
			pass  # "result" and anything else: ignored by the projection

func _reduce(ev) -> void:
	if typeof(ev) != TYPE_DICTIONARY:
		return
	match String(ev.get("type", "")):
		"campus.loaded":
			var c = ev.get("campus", {})
			campus_name = String(c.get("name", ""))
			has_campus = true
		"building.spawned":
			var b = ev.get("building", {})
			_upsert(buildings, {
				"id": String(b.get("id", "")),
				"name": String(b.get("name", "")),
				"leaderAgentId": String(b.get("leaderAgentId", "")),
			})
			var lr = ev.get("leaderRoom", null)
			if lr != null:
				_upsert(rooms, _room(lr))
			var la = ev.get("leaderAgent", null)
			if la != null:
				_upsert(agents, _agent(la))
		"room.spawned":
			_upsert(rooms, _room(ev.get("room", {})))
		"room.head.assigned":
			var rid := String(ev.get("roomId", ""))
			for i in rooms.size():
				if String(rooms[i].get("id", "")) == rid:
					rooms[i]["headAgentId"] = String(ev.get("agentId", ""))
		"agent.instantiated":
			_upsert(agents, _agent(ev.get("agent", {})))
		"worker.entered":
			_upsert(workers, _worker(ev.get("worker", {})))
		"worker.exited":
			_remove(workers, String(ev.get("workerId", "")))
		"runtime.started":
			var rt = ev.get("runtime", {})
			_upsert(runtimes, {
				"id": String(rt.get("id", "")),
				"hostId": String(rt.get("hostId", "")),
				"agentId": String(rt.get("agentId", "")),
				"status": "running",
			})
		"runtime.stopped":
			_set_runtime_status(String(ev.get("runtimeId", "")), "stopped")
		"host.left":
			var hid := String(ev.get("hostId", ""))
			for i in runtimes.size():
				if String(runtimes[i].get("hostId", "")) == hid:
					runtimes[i]["status"] = "stopped"
		"project.created":
			var p = ev.get("project", {})
			var pid := String(p.get("id", ""))
			var bid := String(p.get("buildingId", ""))
			_upsert(projects, {
				"id": pid,
				"buildingId": bid,
				"name": String(p.get("name", "")),
				"status": String(p.get("status", "active")),
			})
			# Mirror the core rule (capa 28): the building leader is auto-assigned to
			# a new project. This assignment is derived in the core reducer, not a
			# separate event, so the client replicates it to stay faithful.
			var lid := _leader_of(bid)
			if lid != "":
				_add_assignment(lid, pid)
		"project.archived":
			for i in projects.size():
				if String(projects[i].get("id", "")) == String(ev.get("projectId", "")):
					projects[i]["status"] = "archived"
		"project.assigned":
			_add_assignment(String(ev.get("agentId", "")), String(ev.get("projectId", "")))
		"project.unassigned":
			_remove_assignment(String(ev.get("agentId", "")), String(ev.get("projectId", "")))
		"task.created":
			var t = ev.get("task", {})
			_upsert(tasks, {
				"id": String(t.get("id", "")),
				"title": String(t.get("title", "")),
				"assigneeId": String(t.get("assigneeId", "")),
				"status": String(t.get("status", "queued")),
			})
		"task.started":
			_set_task_status(String(ev.get("taskId", "")), "running")
		"task.submitted":
			_set_task_status(String(ev.get("taskId", "")), "under_review")
		"task.evaluated":
			_set_task_status(String(ev.get("taskId", "")), String(ev.get("verdict", "")))
		"skin.registered":
			_upsert(skins, _skin(ev.get("skin", {})))
		"building.appearance.set":
			_set_building_appearance(String(ev.get("buildingId", "")), ev.get("appearance", {}))
		"room.appearance.set":
			_set_room_appearance(String(ev.get("roomId", "")), ev.get("appearance", {}))
		"agent.appearance.set":
			_set_agent_appearance(String(ev.get("agentId", "")), ev.get("appearance", {}))
		_:
			pass

## Active project names assigned to an agent.
func projects_of_agent(agent_id: String) -> Array:
	var names: Array = []
	for x in assignments:
		if String(x.get("agentId", "")) != agent_id:
			continue
		for p in projects:
			if String(p.get("id", "")) == String(x.get("projectId", "")) and String(p.get("status", "")) == "active":
				names.append(String(p.get("name", "")))
	return names

## Tasks whose assignee lives in a given building.
func tasks_of_building(building_id: String) -> Array:
	var out: Array = []
	for t in tasks:
		var a := _agent_by_id(String(t.get("assigneeId", "")))
		if not a.is_empty() and String(a.get("buildingId", "")) == building_id:
			out.append(t)
	return out

## Execution plane: an agent is "live" while it has a running runtime.
func is_live(agent_id: String) -> bool:
	for rt in runtimes:
		if String(rt.get("agentId", "")) == agent_id and String(rt.get("status", "")) == "running":
			return true
	return false

func _room(r) -> Dictionary:
	return {
		"id": String(r.get("id", "")),
		"buildingId": String(r.get("buildingId", "")),
		"key": String(r.get("key", "")),
		"role": String(r.get("role", "")),
		"headAgentId": String(r.get("headAgentId", "")),
	}

func _agent(a) -> Dictionary:
	return {
		"id": String(a.get("id", "")),
		"name": String(a.get("name", "")),
		"buildingId": String(a.get("buildingId", "")),
		"roomId": String(a.get("roomId", "")),
		"rankKey": String(a.get("rankKey", "")),
		"skillKey": String(a.get("skillKey", "")),
	}

func _worker(w) -> Dictionary:
	return {
		"id": String(w.get("id", "")),
		"name": String(w.get("name", "")),
		"buildingId": String(w.get("buildingId", "")),
		"roomId": String(w.get("roomId", "")),
	}

func _set_runtime_status(rid: String, status: String) -> void:
	for i in runtimes.size():
		if String(runtimes[i].get("id", "")) == rid:
			runtimes[i]["status"] = status
			return

func _set_task_status(tid: String, status: String) -> void:
	for i in tasks.size():
		if String(tasks[i].get("id", "")) == tid:
			tasks[i]["status"] = status
			return

func _agent_by_id(aid: String) -> Dictionary:
	for a in agents:
		if String(a.get("id", "")) == aid:
			return a
	return {}

func _leader_of(building_id: String) -> String:
	for b in buildings:
		if String(b.get("id", "")) == building_id:
			return String(b.get("leaderAgentId", ""))
	return ""

func _add_assignment(agent_id: String, project_id: String) -> void:
	if agent_id == "" or project_id == "":
		return
	for x in assignments:
		if String(x.get("agentId", "")) == agent_id and String(x.get("projectId", "")) == project_id:
			return
	assignments.append({ "agentId": agent_id, "projectId": project_id })

func _remove_assignment(agent_id: String, project_id: String) -> void:
	for i in assignments.size():
		if String(assignments[i].get("agentId", "")) == agent_id and String(assignments[i].get("projectId", "")) == project_id:
			assignments.remove_at(i)
			return

func _remove(arr: Array, id: String) -> void:
	for i in arr.size():
		if String(arr[i].get("id", "")) == id:
			arr.remove_at(i)
			return

func _upsert(arr: Array, item: Dictionary) -> void:
	for i in arr.size():
		if String(arr[i].get("id", "")) == item["id"]:
			arr[i] = item
			return
	arr.append(item)

func _skin(skin) -> Dictionary:
	return {
		"id": String(skin.get("id", "")),
		"kind": String(skin.get("kind", "")),
		"key": String(skin.get("key", "")),
		"name": String(skin.get("name", "")),
		"assetUrl": String(skin.get("assetUrl", "")),
	}

func _set_building_appearance(bid: String, appearance: Dictionary) -> void:
	for i in buildings.size():
		if String(buildings[i].get("id", "")) == bid:
			var existing = buildings[i].get("appearance", {})
			if existing is Dictionary:
				buildings[i]["appearance"] = _merge(existing, appearance)
			else:
				buildings[i]["appearance"] = appearance

func _set_room_appearance(rid: String, appearance: Dictionary) -> void:
	for i in rooms.size():
		if String(rooms[i].get("id", "")) == rid:
			var existing = rooms[i].get("appearance", {})
			if existing is Dictionary:
				rooms[i]["appearance"] = _merge(existing, appearance)
			else:
				rooms[i]["appearance"] = appearance

func _set_agent_appearance(aid: String, appearance: Dictionary) -> void:
	for i in agents.size():
		if String(agents[i].get("id", "")) == aid:
			var existing = agents[i].get("appearance", {})
			if existing is Dictionary:
				agents[i]["appearance"] = _merge(existing, appearance)
			else:
				agents[i]["appearance"] = appearance

func _merge(dict: Dictionary, patch: Dictionary) -> Dictionary:
	var result = dict.duplicate()
	for k in patch:
		var v = patch[k]
		var val = v if typeof(v) != TYPE_ARRAY else v.duplicate()
		result[k] = val
	return result
