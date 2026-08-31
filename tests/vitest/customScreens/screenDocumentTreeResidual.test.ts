import { expect, test } from "vitest";

import {
  findScreenSectionById,
  getFirstScreenBlockId,
  visitDocumentBlocks,
} from "../../../core/services/customScreens/screenDocumentTree";

const document = {
  schemaVersion: 1 as const,
  sections: [
    {
      id: "section-1",
      type: "section" as const,
      data: {},
      blocks: [
        {
          id: "columns-1",
          type: "columns" as const,
          data: {},
          slots: {
            left: [{ id: "field-1", type: "field" as const, data: {} }],
          },
          children: [{ id: "text-1", type: "text" as const, data: {} }],
        },
      ],
    },
  ],
};

test("visitDocumentBlocks visits top-level, slotted, and child blocks", () => {
  const visited: string[] = [];
  const result = visitDocumentBlocks(document, (block) => {
    visited.push(block.id);
    return block;
  });

  expect(result.sections[0]?.blocks[0]?.id).toBe("columns-1");
  expect(visited.sort()).toEqual(["columns-1", "field-1", "text-1"]);
});

test("findScreenSectionById returns null for a null id and a missing id", () => {
  expect(findScreenSectionById(document, null)).toBeNull();
  expect(findScreenSectionById(document, "missing-section")).toBeNull();
});

test("findScreenSectionById returns the matching section", () => {
  expect(findScreenSectionById(document, "section-1")?.id).toBe("section-1");
});

test("getFirstScreenBlockId returns the first block of the first non-empty section", () => {
  expect(getFirstScreenBlockId(document)).toBe("columns-1");
});

test("getFirstScreenBlockId skips empty sections and returns null for an empty document", () => {
  const withEmptyFirstSection = {
    schemaVersion: 1 as const,
    sections: [
      { id: "section-0", type: "section" as const, data: {}, blocks: [] },
      document.sections[0]!,
    ],
  };
  expect(getFirstScreenBlockId(withEmptyFirstSection)).toBe("columns-1");
  expect(
    getFirstScreenBlockId({
      schemaVersion: 1 as const,
      sections: [{ id: "section-0", type: "section" as const, data: {}, blocks: [] }],
    })
  ).toBeNull();
});
