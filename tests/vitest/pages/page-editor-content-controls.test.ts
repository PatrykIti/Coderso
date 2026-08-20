import { describe, expect, test } from "vitest";

import {
  getPageEditorControlsForTarget,
  pageBlockControlRegistry,
  pageUniversalBlockControls,
} from "../../../core/services/pages/pageEditorControlRegistry";
import {
  PAGE_COLLECTION_LIMIT_CLAMP,
  pageCollectionPaginationModes,
} from "../../../core/services/pages/pageDocumentV2";
import {
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../../core/services/renderContracts/formEmbedContract";

describe("page editor content-block controls", () => {
  test("form block content controls are frozen to the TASK-456 contract", () => {
    expect(pageBlockControlRegistry.form.map((control) => control.id)).toEqual([
      "block.form.props.formId",
      "block.form.props.title",
      "block.form.props.textareaRows",
      "block.form.props.showSelectPrompt",
      "block.form.props.loadingLabel",
      "block.form.props.successBehavior",
    ]);
    const formIdControl = pageBlockControlRegistry.form[0]!;
    expect(formIdControl).toMatchObject({
      panel: "content",
      target: "block",
      label: "Form",
      path: ["props", "formId"],
      overridePath: ["props", "formId"],
      input: "select",
      optionsSource: "forms",
      // Schema-owned nullability: `pageBlockDefaultProps.form.formId` is null
      // (nullableStringSchema), so the combobox offers the "None" row.
      nullable: true,
      responsive: true,
    });
    expect(formIdControl.options).toBeUndefined();
    expect(formIdControl.fallback).toBeUndefined();
    expect(pageBlockControlRegistry.form[1]).toMatchObject({
      panel: "content",
      label: "Title",
      path: ["props", "title"],
      input: "text",
      fallback: "",
    });
    expect(pageBlockControlRegistry.form[2]).toMatchObject({
      panel: "content",
      target: "block",
      label: "Textarea rows",
      path: ["props", "textareaRows"],
      input: "number",
      responsive: false,
      clamp: {
        min: FORM_EMBED_TEXTAREA_ROWS_LIMITS.min,
        max: FORM_EMBED_TEXTAREA_ROWS_LIMITS.max,
      },
      unit: "",
    });
    expect(pageBlockControlRegistry.form[3]).toMatchObject({
      panel: "content",
      target: "block",
      label: "Show select prompt",
      path: ["props", "showSelectPrompt"],
      input: "switch",
      responsive: false,
    });
    expect(pageBlockControlRegistry.form[4]).toMatchObject({
      panel: "content",
      target: "block",
      label: "Loading label",
      path: ["props", "loadingLabel"],
      input: "text",
      responsive: false,
    });
    expect(pageBlockControlRegistry.form[5]).toMatchObject({
      panel: "content",
      target: "block",
      label: "After successful submission",
      path: ["props", "successBehavior"],
      input: "select",
      responsive: false,
      options: FORM_EMBED_SUCCESS_BEHAVIORS,
    });
    // The full target surface = universal block controls + the six content
    // controls; the form block is not typography-capable, so no cluster.
    expect(
      getPageEditorControlsForTarget({ kind: "block", type: "form" }).map((control) => control.id)
    ).toEqual([
      ...pageUniversalBlockControls.map((control) => control.id),
      "block.form.props.formId",
      "block.form.props.title",
      "block.form.props.textareaRows",
      "block.form.props.showSelectPrompt",
      "block.form.props.loadingLabel",
      "block.form.props.successBehavior",
    ]);
  });

  test("collection block content controls are frozen to the TASK-457 contract (+TASK-459-03 pagination)", () => {
    expect(pageBlockControlRegistry.collection.map((control) => control.id)).toEqual([
      "block.collection.props.contentTypeId",
      "block.collection.props.queryId",
      "block.collection.props.limit",
      "block.collection.props.templateId",
      "block.collection.props.paginationMode",
      "block.collection.props.pageSize",
      "block.collection.props.showCta",
    ]);
    const [
      contentTypeControl,
      queryControl,
      limitControl,
      templateControl,
      paginationModeControl,
      pageSizeControl,
      showCtaControl,
    ] = pageBlockControlRegistry.collection;
    expect(contentTypeControl).toMatchObject({
      panel: "content",
      target: "block",
      label: "Content type",
      path: ["props", "contentTypeId"],
      overridePath: ["props", "contentTypeId"],
      input: "select",
      optionsSource: "contentTypes",
      // Schema-owned nullability: `pageBlockDefaultProps.collection.*Id` are
      // null (nullableStringSchema), so each combobox offers the "None" row.
      nullable: true,
      responsive: true,
    });
    expect(contentTypeControl!.options).toBeUndefined();
    expect(contentTypeControl!.fallback).toBeUndefined();
    expect(contentTypeControl!.filterBy).toBeUndefined();
    expect(queryControl).toMatchObject({
      panel: "content",
      label: "Saved query",
      path: ["props", "queryId"],
      input: "select",
      optionsSource: "listingQueries",
      // Saved queries are scoped to the chosen content type (the editor
      // shell filters by this sibling prop and clears queryId on change).
      filterBy: "contentTypeId",
      nullable: true,
    });
    expect(limitControl).toMatchObject({
      panel: "content",
      label: "Limit",
      path: ["props", "limit"],
      input: "number",
      // TASK-459-03 clamp unification: the single owner bound (1..24 from
      // `contentListLimitMax`) replaced the old 1..50 ceiling the runtime
      // silently truncated. Entry count is a unitless readout.
      clamp: { min: PAGE_COLLECTION_LIMIT_CLAMP.min, max: PAGE_COLLECTION_LIMIT_CLAMP.max },
      unit: "",
      fallback: 6,
    });
    expect(PAGE_COLLECTION_LIMIT_CLAMP).toEqual({ min: 1, max: 24 });
    expect(templateControl).toMatchObject({
      panel: "content",
      label: "Listing template",
      path: ["props", "templateId"],
      input: "select",
      optionsSource: "listingTemplates",
      nullable: true,
    });
    expect(templateControl!.filterBy).toBeUndefined();
    // TASK-459-03 visitor pagination: a segmented mode strip (owner enum,
    // default "none" keeps existing pages unchanged) and a nullable page-size
    // number bound to the same owner clamp ("follow limit" when unset).
    expect(paginationModeControl).toMatchObject({
      panel: "content",
      label: "Pagination",
      path: ["props", "paginationMode"],
      input: "segmented",
      options: pageCollectionPaginationModes,
      fallback: "none",
      responsive: true,
    });
    expect(pageCollectionPaginationModes).toEqual(["none", "paged", "load-more"]);
    expect(pageSizeControl).toMatchObject({
      panel: "content",
      label: "Page size",
      path: ["props", "pageSize"],
      input: "number",
      clamp: { min: PAGE_COLLECTION_LIMIT_CLAMP.min, max: PAGE_COLLECTION_LIMIT_CLAMP.max },
      unit: "",
    });
    // Nullable schema default (`pageSize: null` = follow limit): no scalar
    // fallback may lie about the unset state.
    expect(pageSizeControl!.fallback).toBeUndefined();
    expect(showCtaControl).toMatchObject({
      panel: "content",
      target: "block",
      label: "Show card action",
      path: ["props", "showCta"],
      input: "switch",
      responsive: false,
    });
    // The full target surface = universal block controls + the seven content
    // controls; the collection block is not typography-capable, so no cluster.
    expect(
      getPageEditorControlsForTarget({ kind: "block", type: "collection" }).map(
        (control) => control.id
      )
    ).toEqual([
      ...pageUniversalBlockControls.map((control) => control.id),
      "block.collection.props.contentTypeId",
      "block.collection.props.queryId",
      "block.collection.props.limit",
      "block.collection.props.templateId",
      "block.collection.props.paginationMode",
      "block.collection.props.pageSize",
      "block.collection.props.showCta",
    ]);
  });

  test("filters block content controls are frozen to the TASK-459-02 contract", () => {
    expect(pageBlockControlRegistry.filters.map((control) => control.id)).toEqual([
      "block.filters.props.queryId",
      "block.filters.props.facets",
      "block.filters.props.layout",
      "block.filters.props.autoApply",
      "block.filters.props.showSearch",
      "block.filters.props.showCount",
      "block.filters.props.searchLabel",
      "block.filters.props.searchPlaceholder",
      "block.filters.props.applyLabel",
    ]);
    const controlsById = new Map(
      pageBlockControlRegistry.filters.map((control) => [control.id, control])
    );
    expect(controlsById.get("block.filters.props.queryId")).toMatchObject({
      panel: "content",
      target: "block",
      label: "Saved query",
      path: ["props", "queryId"],
      input: "select",
      // Unscoped source: the filters block binds to ANY saved listing query
      // (no contentTypeId sibling exists to scope by).
      optionsSource: "listingQueriesAll",
      // Schema-owned nullability: `pageBlockDefaultProps.filters.queryId` is
      // null (nullableStringSchema), so the combobox offers the "None" row.
      nullable: true,
      responsive: true,
    });
    expect(controlsById.get("block.filters.props.queryId")?.filterBy).toBeUndefined();
    expect(controlsById.get("block.filters.props.facets")).toMatchObject({
      panel: "content",
      label: "Facets",
      path: ["props", "facets"],
      input: "facets",
    });
    expect(controlsById.get("block.filters.props.layout")).toMatchObject({
      panel: "layout",
      input: "segmented",
      options: ["horizontal", "sidebar"],
      fallback: "horizontal",
    });
    for (const toggle of ["autoApply", "showSearch", "showCount"]) {
      expect(controlsById.get(`block.filters.props.${toggle}`)).toMatchObject({
        panel: "content",
        input: "switch",
        // Schema defaults are true: the form auto-applies, shows the search
        // row, and shows the result count unless explicitly disabled.
        fallback: true,
      });
    }
    expect(controlsById.get("block.filters.props.applyLabel")).toMatchObject({
      input: "text",
      fallback: "Apply filters",
    });
    // The full target surface = universal block controls + the nine content
    // controls; the filters block is not typography-capable, so no cluster.
    expect(
      getPageEditorControlsForTarget({ kind: "block", type: "filters" }).map(
        (control) => control.id
      )
    ).toEqual([
      ...pageUniversalBlockControls.map((control) => control.id),
      ...pageBlockControlRegistry.filters.map((control) => control.id),
    ]);
  });
});
