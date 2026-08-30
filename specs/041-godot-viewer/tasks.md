# Tasks — 041 Godot viewer recovery

## Completed

1. [x] Branch `opencode/spec-041-godot-viewer` desde `dev`
2. [x] Spec `specs/041-godot-viewer/spec.md` con premisas y antecedentes
3. [x] Plan `specs/041-godot-viewer/plan.md` con enfoque y cambios
4. [x] Renombrar seed building "Project Alpha" → "Alpha HQ" (apps/server/src/main.ts)
5. [x] Portar implementación cursor desde origin/cursor/spec-040-godot-projects-7599:
   - apps/campus-godot/project.godot (actualizado features "4.3" → "4.7")
   - apps/campus-godot/main.gd
   - apps/campus-godot/campus_client.gd
   - apps/campus-godot/main.tscn
   - apps/campus-godot/run.sh
   - apps/campus-godot/README.md
   - apps/campus-godot/package.json
   - apps/campus-godot/.gitignore
6. [x] Borrar apps/campus-godot-adhoc-bak/ (código ad-hoc previo)
7. [x] Converge: `npm run build` verde
8. [x] Captura evidencia: `SHOT_PATH=/tmp/campus-test.png CAMPUS_URL=ws://localhost:8787 bash apps/campus-godot/run.sh --resolution 900x560` → PNG generado (38KB)
9. [x] `npm test` engine verde (142 tests); apps/api test falla preexistente (graphql) — documentado

## Verificación final

- [x] Visor Godot muestra building "Alpha HQ" con 3 rooms
- [x] Agents en sus rooms (Leader, Mia, Ivan) + worker en engineering
- [x] Inventario: "Onboarding → Leader, Ivan"
- [x] Worker fila "1 worker(s)"
- [x] Engine tests verdes
- [x] Captura `/tmp/campus-test.png` generada

## Pendiente (merge a dev)

- [ ] Commit descriptivo en rama
- [ ] PR a `dev`
- [ ] Merge a `dev`