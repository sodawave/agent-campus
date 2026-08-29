/**
 * Typed sample dataset assembled from the JSON fixtures in `catalog/` and
 * `layouts/`. Reused by the playground app and the domain tests so both run
 * against the same demo campus.
 */

import catalogJson from "./catalog/sample-catalog.json";
import libraryJson from "./catalog/sample-library.json";
import projectJson from "./layouts/sample-project.json";
import buildingJson from "./layouts/reference-building.json";

import type {
  AgentArchetype,
  Campus,
  DocClassification,
  Library,
  LibraryDocument,
  Project,
  Workspace,
} from "./domain/types";
import type { BuildingLayout } from "./domain/layout";

export const sampleCatalog = catalogJson as unknown as AgentArchetype[];

export const sampleBuildingLayout = buildingJson as unknown as BuildingLayout;

const rawProject = projectJson as unknown as Omit<Project, "workspaceIds"> & {
  workspaces: Workspace[];
};

export const sampleWorkspaces: Workspace[] = rawProject.workspaces.map((w) => ({
  ...w,
  projectId: rawProject.id,
}));

export const sampleProject: Project = {
  id: rawProject.id,
  name: rawProject.name,
  campusId: rawProject.campusId,
  buildingId: rawProject.buildingId,
  workspaceIds: sampleWorkspaces.map((w) => w.id),
  context: rawProject.context,
  ranks: rawProject.ranks,
  campusLeadAgentId: rawProject.campusLeadAgentId ?? undefined,
};

const rawLibrary = libraryJson as unknown as {
  campus: Campus;
  library: Library;
  classifications: DocClassification[];
  documents: LibraryDocument[];
};

export const sampleCampus: Campus = rawLibrary.campus;
export const sampleLibrary: Library = rawLibrary.library;
export const sampleClassifications: DocClassification[] =
  rawLibrary.classifications;
export const sampleDocuments: LibraryDocument[] = rawLibrary.documents;

export const sampleDataset = {
  campus: sampleCampus,
  project: sampleProject,
  workspaces: sampleWorkspaces,
  catalog: sampleCatalog,
  library: sampleLibrary,
  classifications: sampleClassifications,
  documents: sampleDocuments,
  building: sampleBuildingLayout,
};
