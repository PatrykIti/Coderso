import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  ContentListAdvancedEditor,
  ContentListVisualEditor,
  ContentListWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ContentListEditors";
import {
  applyContentListRuntimeFilters,
  sortContentListRuntimeEntries,
  type ContentListResolverEntry,
} from "../../../core/services/content/contentListResolver";
import {
  ContentListBlock,
  contentListDefaults,
  createContentListWidget,
  normalizeContentListData,
  normalizeContentListLimit,
  type ContentListData,
} from "../../../core/widgets/core/contentList";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ContentListData>> = () => null;

const createEntry = (
  patch: Partial<ContentListResolverEntry>
): ContentListResolverEntry => ({
  id: "entry-1",
  typeId: "type-1",
  title: "Entry title",
  slug: "entry-title",
  status: "published",
  tags: [],
  data: {},
  publishedAt: new Date("2026-02-07T10:00:00.000Z"),
  scheduledAt: null,
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  updatedAt: new Date("2026-02-07T10:00:00.000Z"),
  author: null,
  ...patch,
});

test("content list renders source placeholder without content type", () => {
  const html = renderToString(<ContentListBlock data={contentListDefaults} variant="cards" />);

  expect(html).toContain("Choose a content type");
  expect(html).toContain('data-content-list-state="missing-source"');
});

test("content list renders resolved items and runtime markers", () => {
  const html = renderToString(
    <ContentListBlock
      variant="compact"
      data={normalizeContentListData({
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 3,
          sort: "published-desc",
        },
        style: {
          ...contentListDefaults.style,
          ctaLabel: "Open post",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Release notes",
              href: "/blog/release-notes",
              excerpt: "Latest platform updates.",
              publishedAt: "2026-02-08T09:00:00.000Z",
              status: "published",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Release notes");
  expect(html).toContain("Open post");
  expect(html).toContain('data-content-list-variant="compact"');
  expect(html).toContain('data-content-list-items="1"');
  expect(html).toContain('data-content-list-state="ready"');
});

test("content list normalizes limit and model defaults", () => {
  expect(normalizeContentListLimit(999)).toBe(24);
  expect(normalizeContentListLimit(0)).toBe(1);

  const normalized = normalizeContentListData({
    source: { limit: 0, sort: "title-asc" },
  });
  expect(normalized.source?.limit).toBe(1);
  expect(normalized.source?.sort).toBe("title-asc");
  expect(normalized.fields?.showImage).toBe(true);
});

test("content list validator accepts resolved payload and exposes visual variant ownership", () => {
  clearWidgets();
  const widget = createContentListWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "content-list-1",
      type: "content-list",
      variant: "cards",
      data: {
        ...contentListDefaults,
        source: {
          contentTypeId: "blog-type-id",
          statusScope: "published",
          limit: 4,
          sort: "published-desc",
        },
        resolved: {
          items: [
            {
              id: "entry-1",
              title: "Entry one",
              href: "/blog/entry-one",
            },
          ],
          total: 1,
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-08T09:10:00.000Z",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("content list validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createContentListWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "content-list-2",
      type: "content-list",
      variant: "unknown",
      data: contentListDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("content list editors render expected sections", () => {
  const wizardHtml = renderToString(
    <ContentListWizardEditor
      value={contentListDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Source setup");
  expect(wizardHtml).toContain("Variant");

  const visualHtml = renderToString(
    <ContentListVisualEditor
      value={contentListDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and layout");
  expect(visualHtml).toContain("Source and filters");
  expect(visualHtml).toContain("Presentation fields");

  const advancedHtml = renderToString(
    <ContentListAdvancedEditor
      value={contentListDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Query controls");
  expect(advancedHtml).toContain("Styling tokens");
  expect(advancedHtml).toContain("Runtime payload snapshot");
});

test("content list runtime filters and sorting respect preview and status scope", () => {
  const entries: ContentListResolverEntry[] = [
    createEntry({
      id: "entry-published",
      title: "Zeta release",
      slug: "zeta-release",
      status: "published",
      tags: ["platform", "featured"],
      publishedAt: new Date("2026-02-08T11:00:00.000Z"),
    }),
    createEntry({
      id: "entry-draft",
      title: "Alpha draft",
      slug: "alpha-draft",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-02-09T11:00:00.000Z"),
    }),
  ];

  const publishedOnly = applyContentListRuntimeFilters(
    entries,
    {
      ...contentListDefaults,
      source: {
        contentTypeId: "type-1",
        statusScope: "all",
        limit: 10,
        sort: "title-asc",
      },
    },
    { preview: false }
  );
  expect(publishedOnly).toHaveLength(1);
  expect(publishedOnly[0]?.id).toBe("entry-published");

  const draftInPreview = applyContentListRuntimeFilters(
    entries,
    {
      ...contentListDefaults,
      source: {
        contentTypeId: "type-1",
        statusScope: "draft",
        limit: 10,
        sort: "title-asc",
      },
    },
    { preview: true }
  );
  expect(draftInPreview).toHaveLength(1);
  expect(draftInPreview[0]?.id).toBe("entry-draft");

  const sorted = sortContentListRuntimeEntries(entries, "title-asc");
  expect(sorted[0]?.title).toBe("Alpha draft");
  expect(sorted[1]?.title).toBe("Zeta release");
});
