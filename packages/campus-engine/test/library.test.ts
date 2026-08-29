import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  return store;
}

describe("library — classifications, documents, bind by skill", () => {
  it("adds classifications and documents (upsert)", () => {
    const store = seededStore();
    expect(store.library.addClassification({ id: "cl-eng", key: "eng", label: "Engineering", skillKeys: ["software-eng"] }).ok).toBe(true);
    expect(store.library.addDocument({ id: "d1", title: "Style Guide", kind: "manual", classificationIds: ["cl-eng"] }).ok).toBe(true);
    expect(store.state().classifications[0]).toMatchObject({ id: "cl-eng", vectorNamespace: "eng" });
    expect(store.state().documents).toHaveLength(1);
  });

  it("upsert replaces by id (no duplicates)", () => {
    const store = seededStore();
    store.library.addClassification({ id: "cl-eng", key: "eng", label: "Engineering", skillKeys: ["software-eng"] });
    store.library.addClassification({ id: "cl-eng", key: "eng", label: "Eng (v2)", skillKeys: ["software-eng", "systems"] });
    expect(store.state().classifications).toHaveLength(1);
    expect(store.state().classifications[0]?.label).toBe("Eng (v2)");
  });

  it("forSkill returns docs bound to that craft via classification", () => {
    const store = seededStore();
    store.library.addClassification({ id: "cl-eng", key: "eng", label: "Engineering", skillKeys: ["software-eng"] });
    store.library.addClassification({ id: "cl-law", key: "law", label: "Legal", skillKeys: ["lawyer"] });
    store.library.addDocument({ id: "d1", title: "Style Guide", kind: "manual", classificationIds: ["cl-eng"] });
    store.library.addDocument({ id: "d2", title: "Contract Law", kind: "law", classificationIds: ["cl-law"] });
    expect(store.library.forSkill("software-eng").map((d) => d.id)).toEqual(["d1"]);
    expect(store.library.forSkill("lawyer").map((d) => d.id)).toEqual(["d2"]);
    expect(store.library.forSkill("unknown")).toEqual([]);
  });

  it("rejects a document referencing an unknown classification", () => {
    const store = seededStore();
    expect(store.library.addDocument({ id: "d1", title: "X", kind: "other", classificationIds: ["nope"] }))
      .toEqual({ ok: false, reason: "classification_not_found" });
  });
});
