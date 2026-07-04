import { expect, test } from "vitest";

import { resolveCustomScreenCapabilities } from "../../../core/services/customScreens/capabilities";
import type {
  CustomScreenDefinition,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

const makeDefinition = (
  block: ScreenBlockV1,
  binding: ScreenFieldBinding
): CustomScreenDefinition => ({
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
          blocks: [block],
        },
      ],
    },
    bindings: [binding],
    saveMode: "entry",
    interactionMode: "inline",
  },
});

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
      definition: makeDefinition(
        {
          id: "screen-header",
          type: "record-header",
          data: {},
        },
        {
          id: "screen-header-title",
          blockId: "screen-header",
          propPath: "title",
          source: "entry",
          field: "headline",
          mode: "read",
        }
      ),
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
      definition: makeDefinition(
        {
          id: "field-1",
          type: "field",
          data: {},
        },
        {
          id: "field-1-value",
          blockId: "field-1",
          propPath: "value",
          source: "entry",
          field: "headline",
          mode: "readwrite",
        }
      ),
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
      definition: makeDefinition(
        {
          id: "header-1",
          type: "record-header",
          data: {},
        },
        {
          id: "header-1-title",
          blockId: "header-1",
          propPath: "title",
          source: "entry",
          field: "headline",
          mode: "readwrite",
        }
      ),
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
