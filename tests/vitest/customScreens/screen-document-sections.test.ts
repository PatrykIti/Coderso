// TASK-500-01: section CRUD ops (pure, Bun-free). Shape LOCKED by TASK-500-05 §2.
import { describe, expect, test } from "vitest";

import {
  addScreenSection,
  appendScreenBlockToSection,
  moveScreenSection,
  removeScreenBindingsForBlockTree,
  removeScreenSection,
  renameScreenSection,
} from "../../../core/services/customScreens/screenDocumentOps";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

const makeBlock = (id: string): ScreenBlockV1 => ({
  id,
  type: "text",
  data: { label: id },
});

const makeDocument = (): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
      label: "Details",
      data: { title: "Details" },
      blocks: [
        {
          id: "group-1",
          type: "field-group",
          data: { title: "Details" },
          slots: {
            content: [
              {
                id: "field-1",
                type: "field",
                data: { label: "Headline" },
              },
            ],
          },
        },
      ],
    },
    {
      id: "section-2",
      type: "section",
      label: "Meta",
      data: { title: "Meta" },
      blocks: [makeBlock("text-1")],
    },
  ],
});

describe("addScreenSection", () => {
  test("appends an empty named section with a stable createId('section') id + seeded data.title", () => {
    const document = makeDocument();
    const { document: next, sectionId } = addScreenSection(document, { label: "Pricing" });

    expect(next.sections).toHaveLength(3);
    const added = next.sections[2]!;
    expect(added.id).toBe(sectionId);
    expect(added.id).toMatch(/^section-/);
    expect(added.type).toBe("section");
    expect(added.blocks).toEqual([]);
    expect(added.label).toBe("Pricing");
    expect(added.data.title).toBe("Pricing");
    // Default label when none is given.
    const { document: withDefault } = addScreenSection(document);
    expect(withDefault.sections[2]?.data.title).toBe("Section");
    // The original document is not mutated.
    expect(document.sections).toHaveLength(2);
  });

  test("respects atIndex and CLAMPS to [0, sections.length]", () => {
    const document = makeDocument();

    const atStart = addScreenSection(document, { atIndex: 0 });
    expect(atStart.document.sections[0]?.id).toBe(atStart.sectionId);

    const middle = addScreenSection(document, { atIndex: 1 });
    expect(middle.document.sections[1]?.id).toBe(middle.sectionId);

    const negative = addScreenSection(document, { atIndex: -5 });
    expect(negative.document.sections[0]?.id).toBe(negative.sectionId);

    const beyond = addScreenSection(document, { atIndex: 99 });
    expect(beyond.document.sections[2]?.id).toBe(beyond.sectionId);
  });
});

describe("renameScreenSection", () => {
  test("updates label AND data.title together; blank falls back to 'Section'", () => {
    const document = makeDocument();
    const renamed = renameScreenSection(document, "section-2", "Summary");
    expect(renamed.sections[1]?.label).toBe("Summary");
    expect(renamed.sections[1]?.data.title).toBe("Summary");
    // Blocks are untouched.
    expect(renamed.sections[1]?.blocks).toEqual(document.sections[1]?.blocks);

    const blank = renameScreenSection(document, "section-2", "   ");
    expect(blank.sections[1]?.label).toBe("Section");
    expect(blank.sections[1]?.data.title).toBe("Section");
  });

  test("unknown sectionId is a no-op (fail-soft, never throws)", () => {
    const document = makeDocument();
    const next = renameScreenSection(document, "missing-section", "Nope");
    expect(next.sections).toEqual(document.sections);
  });
});

describe("moveScreenSection", () => {
  test("up/down swaps adjacent sections", () => {
    const document = makeDocument();
    const movedUp = moveScreenSection(document, "section-2", "up");
    expect(movedUp.sections.map((section) => section.id)).toEqual(["section-2", "section-1"]);

    const movedDown = moveScreenSection(document, "section-1", "down");
    expect(movedDown.sections.map((section) => section.id)).toEqual(["section-2", "section-1"]);
  });

  test("move past a boundary is a NO-OP (mirrors moveScreenBlock guard); unknown id unchanged", () => {
    const document = makeDocument();
    expect(moveScreenSection(document, "section-1", "up")).toBe(document);
    expect(moveScreenSection(document, "section-2", "down")).toBe(document);
    expect(moveScreenSection(document, "missing-section", "up")).toBe(document);
  });
});

describe("removeScreenSection", () => {
  test("returns { document, removed } and COLLECTS removed block ids for binding pruning", () => {
    const document = makeDocument();
    const bindings: ScreenFieldBinding[] = [
      {
        id: "field-1-value",
        blockId: "field-1",
        propPath: "value",
        source: "entry",
        field: "headline",
        mode: "readwrite",
      },
      {
        id: "text-1-value",
        blockId: "text-1",
        propPath: "value",
        source: "entry",
        field: "summary",
        mode: "read",
      },
    ];

    const { document: next, removed } = removeScreenSection(document, "section-1");
    expect(next.sections.map((section) => section.id)).toEqual(["section-2"]);
    expect(removed?.id).toBe("section-1");

    // Host-side pruning: every block in the removed section subtree loses its
    // bindings (nested slot block field-1 included); other sections keep theirs.
    let pruned = bindings;
    removed?.blocks.forEach((block) => {
      pruned = removeScreenBindingsForBlockTree(pruned, block);
    });
    expect(pruned).toEqual([expect.objectContaining({ blockId: "text-1" })]);
  });

  test("LAST-SECTION rule: deleting the only remaining section NO-OPS with removed: null", () => {
    const document = makeDocument();
    const single = removeScreenSection(document, "section-1").document;
    expect(single.sections).toHaveLength(1);

    const result = removeScreenSection(single, "section-2");
    expect(result.removed).toBeNull();
    expect(result.document).toBe(single);
    // The doc never reaches zero sections.
    expect(result.document.sections).toHaveLength(1);
  });

  test("unknown sectionId returns { removed: null } and the unchanged document", () => {
    const document = makeDocument();
    const result = removeScreenSection(document, "missing-section");
    expect(result.removed).toBeNull();
    expect(result.document).toBe(document);
  });
});

describe("appendScreenBlockToSection", () => {
  test("appends to the NAMED section, not sections[0], when a different section is targeted", () => {
    const document = makeDocument();
    const block = makeBlock("text-new");
    const next = appendScreenBlockToSection(document, "section-2", block);

    expect(next.sections[0]?.blocks.map((item) => item.id)).toEqual(["group-1"]);
    expect(next.sections[1]?.blocks.map((item) => item.id)).toEqual(["text-1", "text-new"]);
  });

  test("unknown/null sectionId FAILS SOFT to the first section (never throws)", () => {
    const document = makeDocument();
    const unknown = appendScreenBlockToSection(document, "missing-section", makeBlock("a"));
    expect(unknown.sections[0]?.blocks.map((item) => item.id)).toEqual(["group-1", "a"]);

    const nullTarget = appendScreenBlockToSection(document, null, makeBlock("b"));
    expect(nullTarget.sections[0]?.blocks.map((item) => item.id)).toEqual(["group-1", "b"]);
  });

  test("empty-doc path re-seeds a section via ensureSectionForInsert", () => {
    const empty: ScreenDocumentV1 = { schemaVersion: 1, sections: [] };
    const next = appendScreenBlockToSection(empty, null, makeBlock("seeded"));
    expect(next.sections).toHaveLength(1);
    expect(next.sections[0]?.type).toBe("section");
    expect(next.sections[0]?.blocks.map((item) => item.id)).toEqual(["seeded"]);
  });
});
