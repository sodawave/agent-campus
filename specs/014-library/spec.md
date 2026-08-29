# 014 — Library (biblioteca campus-scoped) (capa 14)

**Rama**: `cursor/spec-014-library-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Biblioteca de **campus** compartida entre edificios: documentos clasificados y ligados a los
agentes **por oficio** (`skill.key`), no por instancia. Base para RAG/recall por oficio.

## Alcance
- `DocKind`; `DocClassification { id, key, label, vectorNamespace, skillKeys[] }`;
  `LibraryDocument { id, title, kind, classificationIds[], sourceUri? }`; `State.classifications[]`,
  `State.documents[]`.
- Comandos `library.addClassification` / `library.addDocument` (upsert por id). Eventos
  `library.classification.upserted` / `library.document.upserted`.
- Helper puro `documentsForSkill`; fachada `library.addClassification/addDocument/forSkill`.

## Fuera de alcance
Vectorización/embeddings reales · reindex · blobs (solo `sourceUri`).

## Criterios (test-gate)
- Alta y upsert (reemplazo por id) de classifications y documents.
- `forSkill(skillKey)` devuelve los docs ligados a ese oficio vía classification.
- Documento con classification inexistente → `classification_not_found`.
- typecheck (engine+apps) + tests + build en verde.
