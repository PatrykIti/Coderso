import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  createFooterWidget,
  footerDefaults,
  FooterBlock,
  resolveFooterColumnsForVariant,
  type FooterData,
} from "../../../core/widgets/core/footer";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { resolveEditableFooterColumns } from "../../../core/admin/ui/widgets/editors/FooterEditors";

const StubEditor: ComponentType<WidgetEditorProps<FooterData>> = () => null;
const StubUnknownEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

test("footer renders defaults", () => {
  const html = renderToString(
    <FooterBlock data={footerDefaults} variant="columns-2" />
  );

  expect(html).toContain("Company");
  expect(html).toContain("Resources");
  expect(html).toContain("Privacy");
});

test("footer resolves columns deterministically by variant", () => {
  const expanded = resolveFooterColumnsForVariant(
    [
      {
        title: "Only one",
        links: [{ label: "Home", href: "/" }],
      },
    ],
    "columns-3"
  );
  const minimal = resolveFooterColumnsForVariant(footerDefaults.columns, "minimal");

  expect(expanded).toHaveLength(3);
  expect(expanded[0]?.title).toBe("Only one");
  expect(expanded[2]?.title).toBe("Product");
  expect(minimal).toHaveLength(1);
});

test("footer editor keeps hidden columns while editing active variant", () => {
  const columns = resolveEditableFooterColumns(
    {
      ...footerDefaults,
      columns: [
        { title: "One", links: [] },
        { title: "Two", links: [] },
        { title: "Three", links: [] },
      ],
    },
    "columns-2"
  );

  expect(columns).toHaveLength(3);
  expect(columns[2]?.title).toBe("Three");
});

test("footer widget exposes slot definitions", () => {
  const widget = createFooterWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.slots).toEqual([
    { id: "column-1", label: "Column 1" },
    { id: "column-2", label: "Column 2" },
    { id: "column-3", label: "Column 3" },
    { id: "bottom", label: "Bottom Strip" },
  ]);
});

test("footer schema accepts legal and social fields", () => {
  clearWidgets();
  registerWidget(
    createFooterWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "footer-1",
      type: "footer",
      variant: "columns-3",
      data: {
        ...footerDefaults,
        legal: {
          copyright: "© 2026 Nextless",
          privacy: "/privacy",
          terms: "/terms",
        },
        social: [
          { type: "x", href: "https://x.com/nextless" },
          { type: "github", href: "https://github.com/nextless" },
        ],
      },
    })
  ).not.toThrow();
});

test("footer renders column and bottom slots", () => {
  clearWidgets();
  registerWidget(
    createFooterWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget({
    type: "badge",
    title: "Badge",
    description: "Simple marker",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Badge" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Badge")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "footer-with-slots",
        type: "footer",
        variant: "columns-2",
        data: footerDefaults,
        slots: {
          "column-1": [
            {
              id: "slot-column-1",
              type: "badge",
              data: { label: "Column widget" },
            },
          ],
          bottom: [
            {
              id: "slot-bottom",
              type: "badge",
              data: { label: "Bottom widget" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Column widget");
  expect(html).toContain("Bottom widget");
});
