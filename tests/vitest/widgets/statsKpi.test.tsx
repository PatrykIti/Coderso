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
  statsKpiItemMax,
  StatsKpiBlock,
  type StatsKpiData,
} from "../../../core/widgets/core/statsKpi";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<StatsKpiData>> = () => null;

test("stats kpi renders defaults", () => {
  const html = renderToString(<StatsKpiBlock data={statsKpiDefaults} variant="cards" />);

  expect(html).toContain(statsKpiDefaults.header?.title ?? "");
  expect(html).toContain('data-stats-kpi-variant="cards"');
  expect(html).toContain('data-stats-kpi-count="4"');
});

test("stats kpi normalization keeps deterministic ids and count bounds", () => {
  const items = normalizeStatsKpiItems(
    [
      { id: "same", value: "10", label: "A" },
      { id: "same", value: "", label: "" },
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]?.id).toBe("same");
  expect(items[1]?.id).toBe("kpi-2");
  expect(items[1]?.value).toBeTruthy();
  expect(items[1]?.label).toBeTruthy();
  expect(normalizeStatsKpiItemCount(999)).toBe(statsKpiItemMax);
  expect(normalizeStatsKpiItemCount(0)).toBe(1);

  const normalized = normalizeStatsKpiData({ items: [] });
  expect(normalized.items).toHaveLength(4);
  expect(normalized.style?.spacing).toBe("md");
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
            value: "120+",
            label: "Projects",
            description: "Delivered campaigns",
            icon: "🚀",
          },
          {
            id: "kpi-2",
            value: "99.9%",
            label: "Uptime",
            description: "Stable platform",
            icon: "⏱",
          },
          {
            id: "kpi-3",
            value: "3x",
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
          divider: true,
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
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

test("stats kpi wizard renders onboarding fields", () => {
  const html = renderToString(
    <StatsKpiWizardEditor
      value={statsKpiDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Stats layout");
  expect(html).toContain("Metric count");
  expect(html).toContain("Primary metric values");
});

test("stats kpi visual renders section-based IA", () => {
  const html = renderToString(
    <StatsKpiVisualEditor
      value={statsKpiDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and metric structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Metrics content and order");
  expect(html).toContain("Typography and colors");
  expect(html).toContain("Layout display options");
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

  expect(html).toContain("Technical spacing and alignment tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Metrics content and order");
});
