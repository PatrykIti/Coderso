import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  SearchBoxAdvancedEditor,
  SearchBoxVisualEditor,
  SearchBoxWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SearchBoxEditors";
import {
  SearchBoxBlock,
  createSearchBoxWidget,
  normalizeSearchBoxData,
  searchBoxDefaults,
  type SearchBoxData,
} from "../../../core/widgets/core/searchBox";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<SearchBoxData>> = () => null;

test("search box renders listing placeholder when query is not selected", () => {
  const html = renderToString(<SearchBoxBlock data={searchBoxDefaults} variant="default" />);
  expect(html).toContain("Select a listing query");
  expect(html).toContain('data-listing-widget="search-box"');
});

test("search box renders listing mode with runtime query value", () => {
  const html = renderToString(
    <SearchBoxBlock
      variant="default"
      blockId="search-box-1"
      data={normalizeSearchBoxData({
        ...searchBoxDefaults,
        mode: "listing",
        listingQueryId: "listing-query-1",
        resolved: {
          query: "newsletter",
        },
      })}
    />
  );

  expect(html).toContain('data-listing-block-id="search-box-1"');
  expect(html).toContain('data-listing-query-id="listing-query-1"');
  expect(html).toContain("newsletter");
});

test("search box renders global mode source toggles", () => {
  const html = renderToString(
    <SearchBoxBlock
      variant="default"
      data={normalizeSearchBoxData({
        ...searchBoxDefaults,
        mode: "global",
        endpoint: "/api/search",
        sources: {
          pages: true,
          entries: false,
          posts: true,
        },
      })}
    />
  );

  expect(html).toContain("data-global-search-form");
  expect(html).toContain('name="sources"');
  expect(html).toContain("Pages");
  expect(html).toContain("Posts");
});

test("search box normalizes and renders route-submit mode separately from endpoint", () => {
  const normalized = normalizeSearchBoxData({
    ...searchBoxDefaults,
    mode: "route-submit",
    displayMode: "compact",
    endpoint: "/api/site-search",
    targetRoute: "https://bad.example/search",
    queryParam: "query-text",
  });

  expect(normalized.targetRoute).toBe("/search");
  expect(normalized.queryParam).toBe("query-text");

  const html = renderToString(<SearchBoxBlock variant="default" data={normalized} />);

  expect(html).toContain('data-search-box-mode="route-submit"');
  expect(html).toContain('data-search-box-display-mode="compact"');
  expect(html).toContain('data-search-target-route="/search"');
  expect(html).toContain('data-search-query-param="query-text"');
  expect(html).toContain('action="/search"');
  expect(html).toContain('name="query-text"');
  expect(html).not.toContain("/api/site-search");
});

test("search box cleared frame style omits listing and global shell backgrounds", () => {
  const listingHtml = renderToString(
    <SearchBoxBlock
      variant="default"
      data={normalizeSearchBoxData({
        ...searchBoxDefaults,
        listingQueryId: "listing-query-1",
        style: {},
      })}
    />
  );
  expect(listingHtml).not.toContain("bg-[var(--color-bg)]/80");
  expect(listingHtml).not.toContain("bg-[var(--color-primary)]");

  const globalHtml = renderToString(
    <SearchBoxBlock
      variant="default"
      data={normalizeSearchBoxData({
        ...searchBoxDefaults,
        mode: "global",
        style: {},
      })}
    />
  );
  expect(globalHtml).not.toContain("bg-[var(--color-bg)]/80");
  expect(globalHtml).not.toContain("bg-[var(--color-primary)]");
});

test("search box validator accepts resolved runtime payload", () => {
  clearWidgets();
  registerWidget(
    createSearchBoxWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "search-box-1",
      type: "search-box",
      variant: "default",
      data: {
        ...searchBoxDefaults,
        mode: "route-submit",
        targetRoute: "/search",
        queryParam: "q",
        resolved: {
          query: "news",
          rejectedTokens: ["__page"],
        },
      },
    })
  ).not.toThrow();

  clearWidgets();
});

test("search box editors render expected sections", () => {
  const wizard = renderToString(
    <SearchBoxWizardEditor value={searchBoxDefaults} onChange={() => undefined} variant="default" />
  );
  expect(wizard).toContain("Search source");
  expect(wizard).not.toContain("Search copy");

  const visual = renderToString(
    <SearchBoxVisualEditor value={searchBoxDefaults} onChange={() => undefined} variant="default" />
  );
  expect(visual).toContain("Search copy");
  expect(visual).toContain("Search interaction");
  expect(visual).toContain("Search surface");
  expect(visual).not.toContain("Search source");

  const advanced = renderToString(
    <SearchBoxAdvancedEditor
      value={searchBoxDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(advanced).toContain("Runtime status");
  expect(advanced).toContain("Runtime diagnostics");
  expect(advanced).toContain("Contract summary");
  expect(advanced).toContain("support-owned");
});

test("search box declares a valid editor ownership contract", () => {
  const definition = createSearchBoxWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  const validation = validateWidgetEditorContract(definition, { requireContract: true });

  expect(validation.valid).toBe(true);
  expect(validation.errors).toEqual([]);
  expect(definition.editorContract?.sections.map((section) => section.id)).toEqual([
    "search-box.wizard.source-setup",
    "search-box.visual.search-copy",
    "search-box.visual.search-interaction",
    "search-box.visual.search-surface",
    "search-box.advanced.runtime-diagnostics",
    "search-box.advanced.runtime-status",
    "search-box.advanced.contract-summary",
  ]);
});
