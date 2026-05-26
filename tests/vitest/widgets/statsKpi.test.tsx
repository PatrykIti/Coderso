import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  StatsKpiAdvancedEditor,
  StatsKpiVisualEditor,
  StatsKpiWizardEditor,
} from "../../../core/admin/ui/widgets/editors/StatsKpiEditors";
import {
  createStatsKpiWidget,
  normalizeStatsKpiData,
  normalizeStatsKpiItemCount,
  normalizeStatsKpiItems,
  statsKpiDefaults,
  statsKpiEditorContract,
  statsKpiItemMax,
  StatsKpiBlock,
  type StatsKpiData,
} from "../../../core/widgets/core/statsKpi";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<StatsKpiData>> = () => null;

test("stats kpi renders defaults with new style markers", () => {
  const html = renderToString(<StatsKpiBlock data={statsKpiDefaults} variant="cards" />);

  expect(html).toContain(statsKpiDefaults.header?.title ?? "");
  expect(html).toContain('data-stats-kpi-variant="cards"');
  expect(html).toContain('data-stats-kpi-count="4"');
  expect(html).toContain('data-stats-kpi-value-size="md"');
  expect(html).toContain('data-stats-kpi-max-width="lg"');
  expect(html).toContain('data-stats-kpi-padding="md"');
  expect(html).toContain('data-stats-kpi-icon-size="md"');
  expect(html).toContain('data-stats-kpi-trend-direction="up"');
  expect(html).toContain('data-stats-kpi-link="true"');
  expect(html).toContain("data-stats-kpi-suffix");
});

test("stats kpi split-highlight balances odd and even secondary metric grids", () => {
  const oddHtml = renderToString(
    <StatsKpiBlock
      data={{
        ...statsKpiDefaults,
        items: [
          { id: "kpi-1", value: "250", label: "Growth" },
          { id: "kpi-2", value: "99.9", label: "Uptime" },
          { id: "kpi-3", value: "18", label: "Support" },
          { id: "kpi-4", value: "4.8", label: "Satisfaction" },
        ],
      }}
      variant="split-highlight"
    />
  );
  const evenHtml = renderToString(
    <StatsKpiBlock
      data={{
        ...statsKpiDefaults,
        items: [
          { id: "kpi-1", value: "250", label: "Growth" },
          { id: "kpi-2", value: "99.9", label: "Uptime" },
          { id: "kpi-3", value: "18", label: "Support" },
          { id: "kpi-4", value: "4.8", label: "Satisfaction" },
          { id: "kpi-5", value: "12", label: "Retention" },
        ],
      }}
      variant="split-highlight"
    />
  );

  expect(oddHtml).toContain("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2");
  expect(evenHtml).toContain("grid grid-cols-1 sm:grid-cols-2 lg:col-span-2");
  expect(evenHtml).not.toContain("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");
});

test("stats kpi normalization keeps deterministic ids, count bounds, and nested optional fields", () => {
  const items = normalizeStatsKpiItems(
    [
      {
        id: "same",
        value: "10",
        label: "A",
        prefix: "$",
        suffix: "K",
        accentColor: "#123456",
        trend: { label: "+9%", direction: "up" },
        link: { href: "/pricing", label: "View pricing", openInNewTab: true },
      } as never,
      { id: "same", value: "", label: "", trend: { label: "", direction: "sideways" } } as never,
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({
    id: "same",
    prefix: "$",
    suffix: "K",
    accentColor: "#123456",
    trend: { label: "+9%", direction: "up" },
    link: { href: "/pricing", label: "View pricing", openInNewTab: true },
  });
  expect(items[1]?.id).toBe("kpi-2");
  expect(items[1]?.value).toBeTruthy();
  expect(items[1]?.label).toBeTruthy();
  expect(items[1]?.trend).toBeUndefined();
  expect(normalizeStatsKpiItemCount(999)).toBe(statsKpiItemMax);
  expect(normalizeStatsKpiItemCount(0)).toBe(1);

  const normalized = normalizeStatsKpiData({ items: [] });
  expect(normalized.items).toHaveLength(4);
  expect(normalized.style).toMatchObject({
    spacing: "md",
    valueSize: "md",
    maxWidth: "lg",
    padding: "md",
    iconSize: "md",
  });
  expect(normalized.style?.valueColor).toBeUndefined();
  expect(normalized.style?.labelColor).toBeUndefined();
  expect(normalized.style?.descriptionColor).toBeUndefined();
  expect(normalized.style?.cardBackground).toBeUndefined();
  expect(normalized.style?.cardBorderColor).toBeUndefined();
  expect(normalized.style?.iconBorderColor).toBeUndefined();
});

test("stats kpi validator accepts expanded model", () => {
  clearWidgets();
  const widget = createStatsKpiWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "stats-kpi-1",
      type: "stats-kpi",
      variant: "split-highlight",
      data: {
        header: {
          title: "Metrics",
          description: "Performance indicators overview.",
        },
        items: [
          {
            id: "kpi-1",
            value: "120",
            suffix: "%",
            label: "Projects",
            description: "Delivered campaigns",
            icon: "🚀",
            accentColor: "#ff5500",
            trend: {
              label: "+18% QoQ",
              direction: "up",
            },
            link: {
              href: "/work",
              label: "See work",
              openInNewTab: false,
            },
          },
          {
            id: "kpi-2",
            value: "99.9",
            suffix: "%",
            label: "Uptime",
            description: "Stable platform",
            icon: "⏱",
          },
          {
            id: "kpi-3",
            value: "3",
            suffix: "x",
            label: "Faster release",
            description: "Content throughput",
            icon: "⚡",
          },
        ],
        style: {
          alignment: "center",
          spacing: "lg",
          valueColor: "#0f172a",
          labelColor: "#334155",
          descriptionColor: "#475569",
          valueSize: "lg",
          divider: true,
          dividerIntensity: "strong",
          maxWidth: "xl",
          padding: "lg",
          minHeight: "compact",
          iconSize: "lg",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
  expect(widget.editorContract).toBe(statsKpiEditorContract);
  expect(validateWidgetEditorContract(widget).valid).toBe(true);
});

test("stats kpi renders safe links but blocks unsafe href output", () => {
  const safeHtml = renderToString(
    <StatsKpiBlock
      data={{
        ...statsKpiDefaults,
        items: [
          {
            id: "kpi-1",
            value: "120",
            suffix: "%",
            label: "Growth",
            link: {
              href: "https://example.com/report",
              label: "Read report",
              openInNewTab: true,
            },
          },
        ],
      }}
      variant="cards"
    />
  );
  const unsafeHtml = renderToString(
    <StatsKpiBlock
      data={{
        ...statsKpiDefaults,
        items: [
          {
            id: "kpi-1",
            value: "120",
            label: "Growth",
            link: {
              href: "javascript:alert(1)",
              label: "Bad",
            },
          },
        ],
      }}
      variant="cards"
    />
  );

  expect(safeHtml).toContain('href="https://example.com/report"');
  expect(safeHtml).toContain('target="_blank"');
  expect(safeHtml).toContain('rel="noopener noreferrer"');
  expect(safeHtml).toContain("Read report");
  expect(unsafeHtml).not.toContain("javascript:alert(1)");
  expect(unsafeHtml).toContain('data-stats-kpi-link="false"');
});

test("stats kpi cleared section and card surfaces omit inline styles", () => {
  const normalized = normalizeStatsKpiData({
    ...statsKpiDefaults,
    style: {},
  });
  const html = renderToString(<StatsKpiBlock data={normalized} variant="cards" />);

  expect(normalized.style?.sectionBackground).toBeUndefined();
  expect(normalized.style?.cardBackground).toBeUndefined();
  expect(normalized.style?.cardBorderColor).toBeUndefined();
  expect(normalized.style?.iconSurface).toBeUndefined();
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
});

test("stats kpi validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createStatsKpiWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "stats-kpi-2",
      type: "stats-kpi",
      variant: "unknown",
      data: statsKpiDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("stats kpi wizard renders publishable onboarding fields", () => {
  const html = renderToString(
    <StatsKpiWizardEditor
      value={statsKpiDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout seed");
  expect(html).toContain("Header seed");
  expect(html).toContain("Metric seed");
  expect(html).toContain("Clear header");
  expect(html).toContain("Spacing guidance");
  expect(html).toContain('data-widget-editor-mode="wizard"');
  expect(html).toContain('data-widget-control-path="items.count"');
});

test("stats kpi visual renders grouped IA", () => {
  const html = renderToString(
    <StatsKpiVisualEditor
      value={statsKpiDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and structure");
  expect(html).toContain("Section header");
  expect(html).toContain("Metrics content and links");
  expect(html).toContain("Typography");
  expect(html).toContain("Card and icon surfaces");
  expect(html).toContain("Section layout and spacing");
  expect(html).toContain('data-widget-editor-mode="visual"');
  expect(html).toContain('data-widget-control-path="style.alignment"');
  expect(html).toContain("Theme default");
  expect(html).not.toContain("Saved custom color");
  expect(html).not.toContain('placeholder="var(--color-accent)"');
  expect(html).not.toContain('placeholder="var(--color-text)"');
  expect(html).not.toContain('placeholder="var(--color-bg)"');
  expect(html).not.toContain('placeholder="var(--color-border)"');
  expect(html).not.toContain('placeholder="var(--color-bg-muted)"');
  expect(html).not.toContain('placeholder="var(--color-bg-subtle)"');
});

test("stats kpi advanced keeps technical-only scope", () => {
  const html = renderToString(
    <StatsKpiAdvancedEditor
      value={statsKpiDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Runtime diagnostics");
  expect(html).toContain("Style diagnostics");
  expect(html).toContain("Runtime summary");
  expect(html).toContain('data-widget-editor-mode="advanced"');
  expect(html).toContain('data-widget-control-readonly="true"');
  expect(html).not.toContain("<pre");
  expect(html).not.toContain("Technical spacing and alignment tokens");
  expect(html).not.toContain("Alignment token");
  expect(html).not.toContain("Metrics content and links");
});
