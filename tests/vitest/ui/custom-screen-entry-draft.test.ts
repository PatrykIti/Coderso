import { expect, test } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type { EntryDetail } from "../../../core/admin/services/entriesClient";
import {
  buildEditorViewCreatePayload,
  buildEditorViewUpdatePayload,
  buildInitialEntryDraft,
  hydrateEditorViewDraft,
  resolveEntryFieldErrorsFromApiError,
  validateEntryDraft,
} from "../../../core/admin/ui/custom-screens/customScreenEntryDraft";
import type {
  CustomScreenEditorViewDefinition,
  CustomScreenEditorViewDefinitionV4,
} from "../../../core/services/customScreens/customScreenSchemas";

const contentType: ContentTypeSummary = {
  id: "type-house-projects",
  name: "House Projects",
  slug: "house-projects",
  status: "published",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["projectStatus"],
    properties: {
      projectStatus: {
        type: "string",
        title: "Project status",
        xFieldType: "select",
        default: "planned",
      },
      budget: {
        type: "number",
        title: "Budget",
        xFieldType: "number",
        default: 100000,
      },
      featured: {
        type: "boolean",
        title: "Featured",
        xFieldType: "boolean",
      },
      internalNotes: {
        type: "string",
        title: "Internal notes",
        xFieldType: "text",
      },
    },
  },
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

const editorView: CustomScreenEditorViewDefinition = {
  saveMode: "entry",
  interactionMode: "inline",
  blocks: [
    {
      id: "field-project-status",
      type: "screen-field-value",
      data: {},
    },
    {
      id: "field-budget",
      type: "screen-field-value",
      data: {},
    },
  ],
  bindings: [
    {
      id: "project-status-value",
      widgetId: "field-project-status",
      propPath: "value",
      field: "projectStatus",
      mode: "readwrite",
    },
    {
      id: "budget-value",
      widgetId: "field-budget",
      propPath: "value",
      field: "budget",
      mode: "write",
    },
    {
      id: "notes-value",
      widgetId: "field-notes",
      propPath: "value",
      field: "internalNotes",
      mode: "read",
    },
  ],
};

const readOnlyEditorView: CustomScreenEditorViewDefinition = {
  saveMode: "entry",
  interactionMode: "inline",
  blocks: [],
  bindings: [
    {
      id: "notes-value",
      widgetId: "field-notes",
      propPath: "value",
      field: "internalNotes",
      mode: "read",
    },
  ],
};

const v4EditorView: CustomScreenEditorViewDefinitionV4 = {
  saveMode: "entry",
  interactionMode: "inline",
  document: {
    schemaVersion: 1,
    sections: [
      {
        id: "section-1",
        type: "section",
        data: { title: "Details" },
        blocks: [
          {
            id: "field-project-status",
            type: "field",
            data: {},
          },
          {
            id: "field-budget",
            type: "field",
            data: {},
          },
        ],
      },
    ],
  },
  bindings: [
    {
      id: "project-status-value",
      blockId: "field-project-status",
      propPath: "value",
      source: "entry",
      field: "projectStatus",
      mode: "readwrite",
    },
    {
      id: "budget-value",
      blockId: "field-budget",
      propPath: "value",
      source: "entry",
      field: "budget",
      mode: "write",
    },
    {
      id: "notes-value",
      blockId: "field-notes",
      propPath: "value",
      source: "entry",
      field: "internalNotes",
      mode: "read",
    },
  ],
};

test("buildInitialEntryDraft initializes defaults for writable Editor View fields only", () => {
  const draft = buildInitialEntryDraft({ contentType, editorView });

  expect(draft.editableFields).toEqual(["projectStatus", "budget"]);
  expect(draft.data).toEqual({
    projectStatus: "planned",
    budget: 100000,
  });
  expect(draft.originalData).toEqual({});
});

test("buildInitialEntryDraft does not fall back to the whole schema without writable bindings", () => {
  const draft = buildInitialEntryDraft({
    contentType,
    editorView: readOnlyEditorView,
  });

  expect(draft.editableFields).toEqual([]);
  expect(draft.data).toEqual({});
});

test("buildInitialEntryDraft reads writable V4 screen bindings without widget contracts", () => {
  const draft = buildInitialEntryDraft({ contentType, editorView: v4EditorView });

  expect(draft.editableFields).toEqual(["projectStatus", "budget"]);
  expect(draft.data).toEqual({
    projectStatus: "planned",
    budget: 100000,
  });
});

test("hydrateEditorViewDraft preserves existing data and does not overwrite defaults with undefined", () => {
  const entry: EntryDetail = {
    id: "entry-1",
    typeId: "type-house-projects",
    title: "Lake House",
    slug: "lake-house",
    status: "draft",
    data: {
      projectStatus: "active",
      internalNotes: "Keep hidden",
    },
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };

  const draft = hydrateEditorViewDraft({ contentType, editorView, entry });

  expect(draft.data).toEqual({
    projectStatus: "active",
    budget: 100000,
  });
  expect(draft.originalData).toEqual(entry.data);
});

test("Editor View payload builders keep create scoped and update non-destructive", () => {
  const draft = hydrateEditorViewDraft({
    contentType,
    editorView,
    entry: {
      id: "entry-1",
      typeId: "type-house-projects",
      title: "Lake House",
      slug: "lake-house",
      status: "draft",
      data: {
        projectStatus: "planned",
        budget: 100000,
        internalNotes: "Keep hidden",
      },
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  });
  const nextDraft = {
    ...draft,
    title: "  Lake House Updated  ",
    slug: "  lake-house-updated  ",
    data: {
      ...draft.data,
      projectStatus: "active",
      budget: 125000,
    },
  };

  expect(buildEditorViewCreatePayload({ contentType, draft: nextDraft })).toEqual({
    title: "Lake House Updated",
    slug: "lake-house-updated",
    data: {
      projectStatus: "active",
      budget: 125000,
    },
  });
  expect(buildEditorViewUpdatePayload({ contentType, draft: nextDraft })).toEqual({
    title: "Lake House Updated",
    slug: "lake-house-updated",
    data: {
      projectStatus: "active",
      budget: 125000,
      internalNotes: "Keep hidden",
    },
  });
});

test("validateEntryDraft reports title, slug, and required editable fields", () => {
  const draft = buildInitialEntryDraft({ contentType, editorView });

  expect(
    validateEntryDraft({
      contentType,
      draft: {
        ...draft,
        data: {
          ...draft.data,
          projectStatus: "",
        },
      },
    })
  ).toEqual({
    title: "Title is required.",
    slug: "Slug is required.",
    projectStatus: "Project Status is required.",
  });
});

test("resolveEntryFieldErrorsFromApiError maps slug conflicts and validation details", () => {
  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: new ApiClientError("entry_slug_conflict", "Entry slug already exists.", 409, {
        field: "slug",
      }),
    })
  ).toEqual({
    slug: "Slug already exists.",
  });

  expect(
    resolveEntryFieldErrorsFromApiError({
      contentType,
      error: new ApiClientError("entry_validation_failed", "Entry validation failed.", 400, {
        validation: [
          {
            instancePath: "",
            keyword: "required",
            params: { missingProperty: "projectStatus" },
            message: "must have required property 'projectStatus'",
          },
        ],
      }),
    })
  ).toEqual({
    projectStatus: "Project Status is required.",
  });
});
