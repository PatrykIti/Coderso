import { describe, expect, it } from "vitest";

import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import { pageBlockControlRegistry } from "../../../core/services/pages/pageEditorControlRegistry";
import { getPageEditorOptionLabels } from "../../../core/services/pages/pageEditorControlUiModel";
import { mapFormBindingToEmbedData } from "../../../core/services/pages/pageDataBlockRenderers";
import { buildPageEditorFormPreviewBinding } from "../../../core/services/pages/pageEditorFormPreview";
import { mapPageCollectionBlockToContentListData } from "../../../core/services/pages/pageRuntimeBindingContract";
import {
  FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../../core/widgets/core/formEmbedContract";
import { buildFormaDomPages } from "../../../scripts/projekty-domow/pages";

const documentWithBlock = (block: PageBlockV2): PageDocumentV2 => {
  const section = createPageSectionV2("content", { id: "section", blocks: [] });
  section.blocks = [block];
  return { ...createDefaultPageDocumentV2(), sections: [section] };
};

const formBinding = () =>
  buildPageEditorFormPreviewBinding("form-contact", "Kontakt", {
    form: {
      id: "form-contact",
      name: "Kontakt",
      status: "published",
      description: "Napisz do nas.",
      successMessage: "Dziękujemy!",
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: { layoutMode: "single", saveProgress: false, stepTitles: [] },
    },
    fields: [],
  });

describe("Page collection and Form presentation props", () => {
  it("allowlists the present-only keys without seeding defaults", () => {
    expect(pageBlockPropKeys.collection).toEqual([
      "contentTypeId",
      "queryId",
      "limit",
      "templateId",
      "paginationMode",
      "pageSize",
      "showCta",
    ]);
    expect(pageBlockPropKeys.form).toEqual([
      "formId",
      "title",
      "textareaRows",
      "showSelectPrompt",
      "loadingLabel",
      "successBehavior",
    ]);
    expect(pageBlockDefaultProps.collection).not.toHaveProperty("showCta");
    expect(pageBlockDefaultProps.form).not.toHaveProperty("textareaRows");
    expect(pageBlockDefaultProps.form).not.toHaveProperty("showSelectPrompt");
    expect(pageBlockDefaultProps.form).not.toHaveProperty("loadingLabel");
    expect(pageBlockDefaultProps.form).not.toHaveProperty("successBehavior");
  });

  it("round-trips valid values using the native Form bounds and enum", () => {
    const collection = createPageBlockV2("collection", { id: "collection" });
    collection.props.showCta = false;
    const form = createPageBlockV2("form", { id: "form" });
    Object.assign(form.props, {
      textareaRows: FORM_EMBED_TEXTAREA_ROWS_LIMITS.min + 3,
      showSelectPrompt: false,
      loadingLabel: "  Wysyłanie...  ",
      successBehavior: FORM_EMBED_SUCCESS_BEHAVIORS[2],
    });
    const document: PageDocumentV2 = {
      ...createDefaultPageDocumentV2(),
      sections: [createPageSectionV2("content", { id: "section", blocks: [collection, form] })],
    };
    const normalized = normalizePageDocumentV2ForWrite(document);
    expect(normalized.sections[0]!.blocks[0]!.props.showCta).toBe(false);
    expect(normalized.sections[0]!.blocks[1]!.props).toMatchObject({
      textareaRows: 5,
      showSelectPrompt: false,
      loadingLabel: "Wysyłanie...",
      successBehavior: "show-message-keep-form",
    });
  });

  it.each([
    ["collection", "showCta", "no"],
    ["form", "textareaRows", FORM_EMBED_TEXTAREA_ROWS_LIMITS.min - 1],
    ["form", "textareaRows", 4.5],
    ["form", "showSelectPrompt", "no"],
    ["form", "loadingLabel", "   "],
    ["form", "loadingLabel", "x".repeat(FORM_EMBED_LOADING_LABEL_MAX_LENGTH + 1)],
    ["form", "successBehavior", "hide"],
  ] as const)("rejects invalid %s.%s fresh writes", (type, key, value) => {
    const block = createPageBlockV2(type, { id: "block" });
    block.props[key] = value;
    expect(() => normalizePageDocumentV2ForWrite(documentWithBlock(block))).toThrow(`props.${key}`);
  });

  it("rejects presentation props in responsive overrides", () => {
    const collection = createPageBlockV2("collection", { id: "collection" });
    collection.responsive = { mobile: { props: { showCta: false } } };
    expect(() => normalizePageDocumentV2ForWrite(documentWithBlock(collection))).toThrow(
      "showCta is base-only"
    );

    const form = createPageBlockV2("form", { id: "form" });
    form.responsive = { tablet: { props: { textareaRows: 5 } } };
    expect(() => normalizePageDocumentV2ForWrite(documentWithBlock(form))).toThrow(
      "textareaRows is base-only"
    );
  });

  it("omits malformed stored values and preserves all unrelated data", () => {
    const form = createPageBlockV2("form", { id: "form" });
    Object.assign(form.props, {
      title: "Kontakt",
      textareaRows: 99,
      showSelectPrompt: "false",
      loadingLabel: " ",
      successBehavior: "unknown",
    });
    const normalized = normalizeStoredPageDocumentV2ForRead(documentWithBlock(form));
    expect(normalized.sections[0]!.blocks[0]!.props).toEqual({
      formId: null,
      title: "Kontakt",
    });
  });

  it("bridges collection showCta without changing the source/read contract", () => {
    const baselineBlock = createPageBlockV2("collection", {
      id: "collection",
      props: {
        contentTypeId: "houses",
        queryId: "published",
        limit: 12,
        templateId: "cards",
      },
    });
    const baseline = mapPageCollectionBlockToContentListData(baselineBlock);
    const hiddenCtaBlock = structuredClone(baselineBlock);
    hiddenCtaBlock.props.showCta = false;
    const hiddenCta = mapPageCollectionBlockToContentListData(hiddenCtaBlock);
    expect(hiddenCta.fields).toMatchObject({ showCta: false });
    expect(hiddenCta.source).toEqual(baseline.source);
    expect(hiddenCta.pagination).toEqual(baseline.pagination);
  });

  it("groups Form presentation values and emits no nested objects when unauthored", () => {
    const block = createPageBlockV2("form", {
      id: "form",
      props: { formId: "form-contact", title: "Kontakt" },
    });
    const binding = formBinding();
    expect(binding?.kind).toBe("form");
    const baseline = mapFormBindingToEmbedData(block, binding!);
    expect(baseline).not.toHaveProperty("fields");
    expect(baseline).not.toHaveProperty("submitBehavior");

    Object.assign(block.props, {
      textareaRows: 5,
      showSelectPrompt: false,
      loadingLabel: "Wysyłanie...",
      successBehavior: "show-message-keep-form",
    });
    expect(mapFormBindingToEmbedData(block, binding!)).toMatchObject({
      fields: { textareaRows: 5, showSelectPrompt: false },
      submitBehavior: {
        loadingLabel: "Wysyłanie...",
        successBehavior: "show-message-keep-form",
      },
    });
  });

  it("registers exact base-only controls and user-facing success labels", () => {
    const ids = [
      "block.collection.props.showCta",
      "block.form.props.textareaRows",
      "block.form.props.showSelectPrompt",
      "block.form.props.loadingLabel",
      "block.form.props.successBehavior",
    ];
    const controls = [
      ...pageBlockControlRegistry.collection,
      ...pageBlockControlRegistry.form,
    ].filter((control) => ids.includes(control.id));
    expect(controls.map((control) => control.id)).toEqual(ids);
    expect(controls.every((control) => control.panel === "content" && !control.responsive)).toBe(
      true
    );
    expect(controls.find((control) => control.id.endsWith("textareaRows"))?.clamp).toEqual({
      min: FORM_EMBED_TEXTAREA_ROWS_LIMITS.min,
      max: FORM_EMBED_TEXTAREA_ROWS_LIMITS.max,
    });
    const behavior = controls.find((control) => control.id.endsWith("successBehavior"))!;
    expect(getPageEditorOptionLabels(behavior.options!, behavior.id)).toEqual({
      "show-message-hide-form": "Hide form",
      "show-message-reset-form": "Reset form",
      "show-message-keep-form": "Keep form",
    });
  });

  it("authors the exact FormaDom project-card and contact presentation", () => {
    const refs = {
      contentType: { ref: "content_type", key: "house-project" } as const,
      listingQuery: { ref: "listing_query", key: "published-projects" } as const,
      listingTemplate: { ref: "listing_template", key: "project-cards" } as const,
      form: { ref: "form", key: "project-brief" } as const,
    };
    const seeds = buildFormaDomPages(refs);
    const projects = seeds.find((seed) => seed.key === "projekty")!.desired
      .data as unknown as PageDocumentV2;
    const contact = seeds.find((seed) => seed.key === "kontakt")!.desired
      .data as unknown as PageDocumentV2;
    expect(
      projects.sections[1]!.blocks.find((block) => block.id === "projects-collection")?.props
    ).toMatchObject({ showCta: false });
    expect(
      contact.sections[1]!.blocks.find((block) => block.id === "contact-form")?.props
    ).toMatchObject({
      textareaRows: 5,
      showSelectPrompt: false,
      loadingLabel: "Wysyłanie...",
      successBehavior: "show-message-keep-form",
    });
  });
});
