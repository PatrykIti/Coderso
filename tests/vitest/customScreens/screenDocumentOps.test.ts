import { expect, test } from "vitest";

import {
  duplicateScreenBlockWithBindings,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
} from "../../../core/services/customScreens/screenDocumentOps";
import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

const document: ScreenDocumentV1 = {
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
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
  ],
};

const bindings: ScreenFieldBinding[] = [
  {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "readwrite",
  },
];

test("removeScreenBindingsForBlockTree removes nested bindings with the deleted block", () => {
  const result = removeScreenBlock(document, "group-1");

  expect(result.document.sections[0]?.blocks).toEqual([]);
  expect(removeScreenBindingsForBlockTree(bindings, result.removed)).toEqual([]);
});

test("duplicateScreenBlockWithBindings clones nested bindings onto cloned block ids", () => {
  const result = duplicateScreenBlockWithBindings(document, bindings, "group-1");

  expect(result.document.sections).toHaveLength(1);
  expect(result.document.sections[0]?.blocks).toHaveLength(2);
  expect(result.bindings).toHaveLength(2);
  expect(result.bindings[1]).toMatchObject({
    propPath: "value",
    field: "headline",
    mode: "readwrite",
  });
  expect(result.bindings[1]?.blockId).not.toBe("field-1");
});
