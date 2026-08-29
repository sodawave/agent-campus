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
var buildings: Array = []  # [{ id, name }]
var rooms: Array = []      # [{ id, buildingId, key, role, headAgentId }]
var agents: Array = []     # [{ id, name, buildingId, roomId, rankKey, skillKey }]
var workers: Array = []    # [{ id, name, buildingId, roomId }] (anonymous, ephemeral)
var runtimes: Array = []   # [{ id, hostId, agentId, status }] (execution plane -> liveness)

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
			_upsert(buildings, { "id": String(b.get("id", "")), "name": String(b.get("name", "")) })
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
		_:
			pass

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
