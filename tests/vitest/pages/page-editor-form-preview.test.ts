import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  buildPageEditorFormPreviewBinding,
  buildPageEditorFormPreviewBindings,
  collectPageEditorFormPreviewFormIds,
  type PageEditorFormPreviewDetail,
} from "../../../core/services/pages/pageEditorFormPreview";

const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

const contactDetail: PageEditorFormPreviewDetail = {
  form: {
    id: "form-contact",
    name: "Contact",
    status: "draft",
    description: "Reach out.",
    successMessage: "Thanks!",
    successRedirectUrl: "/thanks",
    submissionAccess: "public",
    settings: { layoutMode: "multi_step", saveProgress: true, stepTitles: ["About you"] },
  },
  fields: [
    {
      id: "fld-name",
      type: "text",
      label: "Name",
      name: "name",
      required: true,
      settings: { placeholder: "Jane" },
      orderIndex: 0,
    },
  ],
};

describe("page editor form preview mapper (TASK-456)", () => {
  test("maps a cached form detail onto a canvas-safe runtime binding", () => {
    const binding = buildPageEditorFormPreviewBinding("form-contact", "Contact us", contactDetail);
    expect(binding).toMatchObject({
      kind: "form",
      formId: "form-contact",
      title: "Contact us",
      resolution: {
        formId: "form-contact",
        formName: "Contact",
        description: "Reach out.",
        status: "draft",
        successMessage: "Thanks!",
        successRedirectUrl: "/thanks",
        submissionAccess: "public",
        // Canvas-safe by construction: no nonce, no captcha projection.
        submissionNonce: null,
        botProtection: null,
      },
    });
    // Authoring preview mirrors runtime PREVIEW semantics: fields render even
    // for unpublished forms, and the form settings pass the owner normalizer.
    expect(binding.resolution.error).toBeUndefined();
    expect(binding.resolution.fields).toEqual([
      {
        id: "fld-name",
        type: "text",
        label: "Name",
        name: "name",
        required: true,
        settings: { placeholder: "Jane" },
        orderIndex: 0,
      },
    ]);
    expect(binding.resolution.settings).toMatchObject({
      layoutMode: "multi_step",
      saveProgress: true,
      stepTitles: ["About you"],
    });
  });

  test("maps a missing form to the runtime fail-closed error binding", () => {
    const binding = buildPageEditorFormPreviewBinding("form-deleted", null, null);
    expect(binding).toMatchObject({
      kind: "form",
      formId: "form-deleted",
      title: null,
      resolution: {
        formId: "form-deleted",
        formName: "",
        status: "missing",
        submissionAccess: "public",
        submissionNonce: null,
        fields: [],
        error: "form_not_found",
      },
    });
  });

  test("collects unique referenced form ids across slots and responsive overrides", () => {
    const document = createDocument([
      createPageSectionV2("content", {
        id: "sec-forms",
        blocks: [
          createPageBlockV2("form", {
            id: "blk-base",
            props: { formId: "form-a", title: "" },
            responsive: { mobile: { props: { formId: "form-mobile" } } },
          }),
          createPageBlockV2("form", { id: "blk-unset", props: { formId: null, title: "" } }),
          createPageBlockV2("columns", {
            id: "blk-columns",
            props: { count: 2, gap: 24, distribution: "equal" },
            slots: {
              "column:1": [
                createPageBlockV2("form", {
                  id: "blk-nested",
                  props: { formId: "form-b", title: "" },
                }),
              ],
            },
          }),
          createPageBlockV2("form", {
            id: "blk-duplicate",
            props: { formId: "form-a", title: "" },
            visibility: { visible: false },
          }),
        ],
      }),
    ]);
    expect(collectPageEditorFormPreviewFormIds(document).sort()).toEqual([
      "form-a",
      "form-b",
      "form-mobile",
    ]);
  });

  test("builds per-breakpoint bindings only for resolved details", () => {
    const document = createDocument([
      createPageSectionV2("content", {
        id: "sec-bindings",
        blocks: [
          createPageBlockV2("form", {
            id: "blk-ready",
            props: { formId: "form-contact", title: "Reach us" },
            responsive: { mobile: { props: { formId: "form-mobile" } } },
          }),
          createPageBlockV2("form", { id: "blk-pending", props: { formId: "form-x", title: "" } }),
          createPageBlockV2("form", { id: "blk-unset", props: { formId: null, title: "" } }),
        ],
      }),
    ]);

    const desktop = buildPageEditorFormPreviewBindings(document, "desktop", {
      "form-contact": contactDetail,
    });
    expect(Object.keys(desktop)).toEqual(["blk-ready"]);
    expect(desktop["blk-ready"]).toMatchObject({
      kind: "form",
      formId: "form-contact",
      title: "Reach us",
    });

    // The mobile override resolves the overridden formId; unresolved details
    // produce NO binding (the renderer shows its canvas loading state), and a
    // null detail produces the fail-closed binding.
    const mobile = buildPageEditorFormPreviewBindings(document, "mobile", {
      "form-contact": contactDetail,
      "form-mobile": null,
    });
    expect(mobile["blk-ready"]).toMatchObject({
      formId: "form-mobile",
      resolution: { error: "form_not_found" },
    });
    expect(mobile["blk-pending"]).toBeUndefined();
    expect(mobile["blk-unset"]).toBeUndefined();
  });
});
