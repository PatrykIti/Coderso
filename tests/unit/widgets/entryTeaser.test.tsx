import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  EntryTeaserAdvancedEditor,
  EntryTeaserVisualEditor,
  EntryTeaserWizardEditor,
} from "../../../core/admin/ui/widgets/editors/EntryTeaserEditors";
import {
  EntryTeaserBlock,
  createEntryTeaserWidget,
  entryTeaserDefaults,
  normalizeEntryTeaserData,
  type EntryTeaserData,
} from "../../../core/widgets/core/entryTeaser";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<EntryTeaserData>> = () => null;

test("entry teaser renders source placeholder without content type", () => {
  const html = renderToString(
    <EntryTeaserBlock data={entryTeaserDefaults} variant="horizontal" />
  );

  expect(html).toContain("Select content type");
  expect(html).toContain('data-entry-teaser-state="missing-source"');
});

test("entry teaser renders resolved item and markers", () => {
  const html = renderToString(
    <EntryTeaserBlock
      variant="vertical"
      data={normalizeEntryTeaserData({
        ...entryTeaserDefaults,
        sourceMode: "manual",
        source: {
          contentTypeId: "blog-type-id",
          entryId: "entry-1",
        },
        cta: {
          label: "Open post",
          hrefMode: "auto",
        },
        resolved: {
          item: {
            id: "entry-1",
            title: "Quarterly update",
            href: "/blog/quarterly-update",
            excerpt: "Highlights from this quarter.",
            tags: ["news", "featured"],
            status: "published",
            publishedAt: "2026-02-09T12:00:00.000Z",
          },
          sourceTypeId: "blog-type-id",
          sourceTypeSlug: "blog",
          resolvedAt: "2026-02-09T12:01:00.000Z",
        },
      })}
    />
  );

  expect(html).toContain("Quarterly update");
  expect(html).toContain("Open post");
  expect(html).toContain('data-entry-teaser-variant="vertical"');
  expect(html).toContain('data-entry-teaser-source-mode="manual"');
  expect(html).toContain('data-entry-teaser-state="ready"');
});

test("entry teaser validator accepts extended model and visual ownership", () => {
  clearWidgets();
  const widget = createEntryTeaserWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "entry-teaser-1",
      type: "entry-teaser",
      variant: "minimal",
      data: {
        ...entryTeaserDefaults,
        sourceMode: "featured",
        source: {
          contentTypeId: "blog-type-id",
          entryId: "",
        },
        fallback: {
          title: "Nothing to show",
          description: "Try another source mode",
          fallbackToLatest: true,
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("entry teaser validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createEntryTeaserWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "entry-teaser-2",
      type: "entry-teaser",
      variant: "unknown",
      data: entryTeaserDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("entry teaser editors render expected sections", () => {
  const wizardHtml = renderToString(
    <EntryTeaserWizardEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Source mode");
  expect(wizardHtml).toContain("Variant");

  const visualHtml = renderToString(
    <EntryTeaserVisualEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and structure");
  expect(visualHtml).toContain("Source configuration");
  expect(visualHtml).toContain("CTA behavior");

  const advancedHtml = renderToString(
    <EntryTeaserAdvancedEditor
      value={entryTeaserDefaults}
      onChange={() => undefined}
      variant="horizontal"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Style tokens");
  expect(advancedHtml).toContain("Fallback behavior");
  expect(advancedHtml).toContain("Runtime payload snapshot");
});

test("entry teaser normalization keeps deterministic fallback defaults", () => {
  const normalized = normalizeEntryTeaserData({
    sourceMode: "featured",
    source: {
      contentTypeId: "blog-type-id",
    },
    cta: {
      hrefMode: "custom",
      href: "",
    },
  });

  expect(normalized.sourceMode).toBe("featured");
  expect(normalized.fallback?.fallbackToLatest).toBe(true);
  expect(normalized.cta?.hrefMode).toBe("custom");
  expect(normalized.style?.radius).toBe("lg");
});
