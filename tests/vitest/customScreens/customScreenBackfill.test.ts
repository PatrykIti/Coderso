import { expect, test } from "vitest";

import { buildCustomScreenV4BackfillPatch } from "../../../core/services/customScreens/customScreenBackfill";

test("buildCustomScreenV4BackfillPatch migrates legacy blocks and bindings to V4", () => {
  const patch = buildCustomScreenV4BackfillPatch({
    id: "screen-legacy",
    schemaVersion: 1,
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        data: { headline: "Legacy headline" },
      },
    ],
    bindings: [
      {
        id: "hero-title",
        widgetId: "hero-1",
        propPath: "headline",
        field: "title",
        mode: "readwrite",
      },
    ],
  });

  expect(patch).toMatchObject({
    id: "screen-legacy",
    schemaVersion: 4,
    definition: {
      schemaVersion: 4,
      editorView: {
        document: {
          sections: [
            expect.objectContaining({
              blocks: [
                expect.objectContaining({
                  id: "hero-1",
                  type: "legacy-widget",
                  legacyWidgetType: "hero",
                }),
              ],
            }),
          ],
        },
        bindings: [
          {
            id: "hero-title",
            blockId: "hero-1",
            propPath: "headline",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
        ],
      },
    },
  });
});
