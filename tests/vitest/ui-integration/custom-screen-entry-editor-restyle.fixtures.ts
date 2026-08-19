// TASK-467-02 fixture module: pure data fixtures for the custom-screen entry
// editor restyle suite. Extracted from
// `custom-screen-entry-editor-restyle.test.tsx` so the owning test file stays
// under the 1,000-line repository gate. All mock wiring, mutable state, mount
// helpers, and tests remain in the test file; this module only exports static
// fixture builders, fixture records, and the shared media IDs.
import type { EntryDetail } from "@/services/entriesClient";
import type { CustomScreenRecord } from "@/services/customScreensEditorClient";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

export const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

/**
 * TASK-479-14-L05 presentation guard: pins the calm document-card framing,
 * definition-driven per-screen layouts, and the inline-edit dirty affordance.
 *
 * NOTE: prototype-only checklist/activity variants and the mark toolbar have no
 * backing in the real custom-screen model. Per the de-fabrication rule they are
 * not asserted; presentation is proven through the definition-driven layout.
 */
export type EntryEditorFixture = {
  screen: CustomScreenRecord & { definition: CustomScreenDefinition };
  contentType: ContentTypeSummary;
  entry: EntryDetail;
};

export const makeFixture = (opts: {
  screenId: string;
  contentTypeId: string;
  slug: string;
  fieldLabel: string;
  fieldName: string;
  entryTitle: string;
}): EntryEditorFixture => {
  const contentType: ContentTypeSummary = {
    id: opts.contentTypeId,
    name: opts.slug,
    slug: opts.slug,
    status: "published" as const,
    schema: {
      type: "object" as const,
      additionalProperties: false as const,
      properties: {
        [opts.fieldName]: {
          type: "string" as const,
          title: opts.fieldLabel,
          xFieldType: "text",
        },
      },
    },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  const screen: EntryEditorFixture["screen"] = {
    id: opts.screenId,
    name: opts.slug,
    contentTypeId: opts.contentTypeId,
    status: "active" as const,
    collectionRole: null,
    compositionKey: null,
    showInSidebar: true,
    sidebarLabel: opts.slug,
    schemaVersion: 4,
    definition: {
      schemaVersion: 4,
      listView: {
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" as const },
        bulkActions: { delete: true, publish: true, unpublish: true },
      },
      editorView: {
        saveMode: "entry" as const,
        interactionMode: "inline" as const,
        document: {
          schemaVersion: 1 as const,
          sections: [
            {
              id: "section-1",
              type: "section",
              data: { title: "Details" },
              blocks: [
                {
                  id: "field-1",
                  type: "field",
                  data: { label: opts.fieldLabel, field: opts.fieldName },
                },
              ],
            },
          ],
        },
        bindings: [
          {
            id: "binding-1",
            blockId: "field-1",
            propPath: "value",
            source: "entry" as const,
            field: opts.fieldName,
            mode: "readwrite" as const,
          },
        ],
      },
    },
    blocks: [],
    bindings: [],
    capabilities: {
      mode: "editor",
      hasBlocks: true,
      hasBindings: true,
      hasReadableBindings: true,
      hasWritableBindings: true,
      supportsDedicatedPreview: true,
      supportsDedicatedEditor: true,
      bindingCounts: { total: 1, readable: 1, writable: 1 },
    },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  const entry: EntryDetail = {
    id: "1",
    typeId: opts.contentTypeId,
    title: opts.entryTitle,
    slug: "entry-1",
    status: "draft" as const,
    visibility: "public",
    hasPassword: false,
    data: { [opts.fieldName]: opts.entryTitle },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
  return { screen, contentType, entry };
};

export const projectFixture = makeFixture({
  screenId: "project-catalog",
  contentTypeId: "type-1",
  slug: "projects",
  fieldLabel: "Headline",
  fieldName: "headline",
  entryTitle: "Project Aurora",
});

export const clientFixture = makeFixture({
  screenId: "client-roster",
  contentTypeId: "type-2",
  slug: "clients",
  fieldLabel: "Account owner",
  fieldName: "owner",
  entryTitle: "Acme Corp",
});

export const BOUND_MEDIA_ID = "11111111-1111-4111-8111-111111111111";
export const OVERRIDE_MEDIA_ID = "22222222-2222-4222-8222-222222222222";
export const ADDITIONAL_MEDIA_ID = "33333333-3333-4333-8333-333333333333";
export const imageFixture = (() => {
  const base = makeFixture({
    screenId: "image-catalog",
    contentTypeId: "type-image",
    slug: "images",
    fieldLabel: "Headline",
    fieldName: "headline",
    entryTitle: "Image record",
  });
  return {
    ...base,
    contentType: {
      ...base.contentType,
      schema: {
        ...base.contentType.schema,
        properties: {
          ...base.contentType.schema.properties,
          cover: {
            type: "string" as const,
            title: "Cover",
            xFieldType: "media",
          },
        },
      },
    },
    screen: {
      ...base.screen,
      definition: {
        ...base.screen.definition,
        editorView: {
          ...base.screen.definition.editorView,
          document: {
            schemaVersion: 1 as const,
            sections: [
              {
                id: "section-1",
                type: "section" as const,
                data: { title: "Details" },
                blocks: [
                  { id: "image-1", type: "image" as const, data: { label: "Cover" } },
                  {
                    id: "media-field",
                    type: "field" as const,
                    data: { label: "Media field", field: "cover" },
                  },
                  ...base.screen.definition.editorView.document.sections[0]!.blocks,
                ],
              },
            ],
          },
          bindings: [
            {
              id: "image-src",
              blockId: "image-1",
              propPath: "src",
              source: "entry" as const,
              field: "cover",
              mode: "read" as const,
            },
            {
              id: "media-field-value",
              blockId: "media-field",
              propPath: "value",
              source: "entry" as const,
              field: "cover",
              mode: "readwrite" as const,
            },
            ...base.screen.definition.editorView.bindings,
          ],
        },
      },
    },
    entry: {
      ...base.entry,
      data: { ...base.entry.data, cover: BOUND_MEDIA_ID },
    },
  };
})();

export const multipleMediaFixture: EntryEditorFixture = {
  ...imageFixture,
  contentType: {
    ...imageFixture.contentType,
    schema: {
      ...imageFixture.contentType.schema,
      properties: {
        ...imageFixture.contentType.schema.properties,
        cover: {
          type: "array",
          items: { type: "string" },
          maxItems: 3,
          title: "Gallery",
          xFieldType: "media",
          xFieldConfig: {
            media: { multiple: true, accept: ["image/*"], maxItems: 3 },
          },
        },
      },
    },
  },
  entry: {
    ...imageFixture.entry,
    data: {
      ...imageFixture.entry.data,
      cover: [BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID],
    },
  },
};
