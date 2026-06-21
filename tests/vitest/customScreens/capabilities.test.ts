import { expect, test } from "vitest";

import { resolveCustomScreenCapabilities } from "../../../core/services/customScreens/capabilities";

test("resolveCustomScreenCapabilities returns collection-only for empty screens", () => {
  expect(
    resolveCustomScreenCapabilities({
      blocks: [],
      bindings: [],
    })
  ).toMatchObject({
    mode: "collection-only",
    hasBlocks: false,
    hasBindings: false,
    supportsDedicatedPreview: false,
    supportsDedicatedEditor: false,
  });
});

test("resolveCustomScreenCapabilities returns dashboard for readable bindings without write access", () => {
  expect(
    resolveCustomScreenCapabilities({
      blocks: [{ id: "screen-header", type: "screen-record-header", data: {} }],
      bindings: [
        {
          id: "screen-header-title",
          widgetId: "screen-header",
          propPath: "title",
          field: "headline",
          mode: "read",
        },
      ],
    })
  ).toMatchObject({
    mode: "dashboard",
    hasBlocks: true,
    hasReadableBindings: true,
    hasWritableBindings: false,
    supportsDedicatedPreview: true,
    supportsDedicatedEditor: false,
  });
});

test("resolveCustomScreenCapabilities returns editor when writable bindings exist", () => {
  expect(
    resolveCustomScreenCapabilities({
      blocks: [{ id: "field-1", type: "screen-field-value", data: {} }],
      bindings: [
        {
          id: "field-1-value",
          widgetId: "field-1",
          propPath: "value",
          field: "headline",
          mode: "readwrite",
        },
      ],
    })
  ).toMatchObject({
    mode: "editor",
    hasBlocks: true,
    hasReadableBindings: true,
    hasWritableBindings: true,
    supportsDedicatedPreview: true,
    supportsDedicatedEditor: true,
  });
});

test("resolveCustomScreenCapabilities treats writable header bindings as editor-capable", () => {
  expect(
    resolveCustomScreenCapabilities({
      blocks: [{ id: "header-1", type: "screen-record-header", data: {} }],
      bindings: [
        {
          id: "header-1-title",
          widgetId: "header-1",
          propPath: "title",
          field: "headline",
          mode: "readwrite",
        },
      ],
    })
  ).toMatchObject({
    mode: "editor",
    hasReadableBindings: true,
    hasWritableBindings: true,
    supportsDedicatedPreview: true,
    supportsDedicatedEditor: true,
  });
});

test("resolveCustomScreenCapabilities derives editor mode from v4 screen documents", () => {
  expect(
    resolveCustomScreenCapabilities({
      definition: {
        schemaVersion: 4,
        listView: {
          columns: [],
          filters: [],
          defaultSort: { field: "updatedAt", direction: "desc" },
          bulkActions: { delete: true, publish: true, unpublish: true },
        },
        editorView: {
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: "section-1",
                type: "section",
                data: { title: "Details" },
                blocks: [
                  {
                    id: "field-headline",
                    type: "field",
                    data: {},
                  },
                ],
              },
            ],
          },
          bindings: [
            {
              id: "field-headline-value",
              blockId: "field-headline",
              propPath: "value",
              source: "entry",
              field: "headline",
              mode: "readwrite",
            },
          ],
          saveMode: "entry",
          interactionMode: "inline",
        },
      },
    })
  ).toMatchObject({
    mode: "editor",
    hasBlocks: true,
    hasReadableBindings: true,
    hasWritableBindings: true,
    supportsDedicatedEditor: true,
  });
});
