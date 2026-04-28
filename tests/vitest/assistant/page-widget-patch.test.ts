import { expect, test } from "vitest";

import { applyPageWidgetDataPatch } from "../../../core/services/assistant/pageWidgetPatch";
import type { WidgetBlock } from "../../../core/widgets/types";

const blocks: WidgetBlock[] = [
  {
    id: "hero-1",
    type: "hero",
    data: {
      title: "Old title",
      cta: {
        label: "Start",
      },
    },
  },
  {
    id: "text-1",
    type: "rich-text-section",
    data: {
      text: "Keep me",
    },
  },
];

test("applyPageWidgetDataPatch patches existing nested data paths and preserves siblings", () => {
  const result = applyPageWidgetDataPatch(blocks, {
    blockId: "hero-1",
    expectedBlockType: "hero",
    dataPath: ["cta", "label"],
    value: "Contact us",
  });

  expect(result.status).toBe("ok");
  expect(result.beforeValue).toBe("Start");
  expect(result.nextValue).toBe("Contact us");
  expect(result.blocks[0]?.data).toMatchObject({
    title: "Old title",
    cta: {
      label: "Contact us",
    },
  });
  expect(result.blocks[1]).toBe(blocks[1]);
  expect(blocks[0]?.data).toMatchObject({
    cta: {
      label: "Start",
    },
  });
});

test("applyPageWidgetDataPatch blocks missing paths and type mismatches", () => {
  expect(
    applyPageWidgetDataPatch(blocks, {
      blockId: "hero-1",
      dataPath: ["missing"],
      value: "Nope",
    }).status
  ).toBe("missing_path");

  expect(
    applyPageWidgetDataPatch(blocks, {
      blockId: "hero-1",
      expectedBlockType: "cta-banner",
      dataPath: ["title"],
      value: "Nope",
    }).status
  ).toBe("type_mismatch");

  expect(
    applyPageWidgetDataPatch(blocks, {
      blockId: "missing",
      dataPath: ["title"],
      value: "Nope",
    }).status
  ).toBe("missing_block");
});
