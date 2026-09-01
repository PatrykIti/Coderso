import { expect, test } from "vitest";

import { findDetailTemplateBlockPath } from "../../../core/admin/ui/content-types/DetailTemplateCanvas";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

test("finds a nested block in a later valid slot and returns null when it is absent", () => {
  const target = createPageBlockV2("heading", {
    id: "block-target",
    props: { text: "Nested target", level: "h2" },
  });
  const columns = createPageBlockV2("columns", {
    id: "block-columns",
    slots: {
      "column:1": [
        createPageBlockV2("heading", {
          id: "block-first-column",
          props: { text: "First column", level: "h2" },
        }),
      ],
      "column:2": [
        createPageBlockV2("container", {
          id: "block-second-column-container",
          slots: { children: [target] },
        }),
      ],
    },
  });
  const section = createPageSectionV2("content", {
    id: "section-content",
    blocks: [columns],
  });

  expect(findDetailTemplateBlockPath(section, target.id)).toEqual([
    { index: 0 },
    { slotKey: "column:2", index: 0 },
    { slotKey: "children", index: 0 },
  ]);
  expect(findDetailTemplateBlockPath(section, "block-missing")).toBeNull();
});
