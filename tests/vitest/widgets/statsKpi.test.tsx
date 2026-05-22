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
  statsKpiSchema,
  StatsKpiBlock,
  type StatsKpiData,
} from "../../../core/widgets/core/statsKpi";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<StatsKpiData>> = () => null;

const getSchemaProperties = (schemaValue: unknown): Record<string, unknown> => {
  if (!schemaValue || typeof schemaValue !== "object") return {};
  const properties = (schemaValue as { properties?: unknown }).properties;
  return properties && typeof properties === "object"
    ? (properties as Record<string, unknown>)
    : {};
};

const statsKpiRootProperties = getSchemaProperties(statsKpiSchema);
const statsKpiStyleProperties = getSchemaProperties(statsKpiRootProperties.style);
const statsKpiItemProperties = getSchemaProperties(
  typeof statsKpiRootProperties.items === "object" && statsKpiRootProperties.items !== null
    ? (statsKpiRootProperties.items as { items?: unknown }).items
    : undefined
);

const hasStatsKpiStyleField = (field: string) =>
  Object.prototype.hasOwnProperty.call(statsKpiStyleProperties, field);
const hasStatsKpiItemField = (field: string) =>
  Object.prototype.hasOwnProperty.call(statsKpiItemProperties, field);

const hasTask287ExpandedSchema =
  hasStatsKpiStyleField("valueSize") &&
  hasStatsKpiStyleField("descriptionColor") &&
  hasStatsKpiStyleField("sectionBackground") &&
  hasStatsKpiStyleField("maxWidth") &&
  hasStatsKpiStyleField("padding") &&
  hasStatsKpiStyleField("minHeight") &&
  hasStatsKpiStyleField("iconSize") &&
  hasStatsKpiStyleField("iconSurface") &&
  hasStatsKpiStyleField("iconBorderColor") &&
  hasStatsKpiItemField("prefix") &&
  hasStatsKpiItemField("suffix") &&
  hasStatsKpiItemField("accentColor") &&
  hasStatsKpiItemField("trend");

const hasTask287MetricLinks = hasStatsKpiItemField("link");

const expectHtmlToContainOneOf = (html: string, fragments: string[]) => {
  expect(fragments.some((fragment) => html.includes(fragment))).toBe(true);
};

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

  const expandedData = {
    header: {
      title: "Metrics",
      description: "Performance indicators overview.",
    },
    items: [
      {
        id: "kpi-1",
        value: "120",
        label: "Projects",
        description: "Delivered campaigns",
        icon: "🚀",
        ...(hasStatsKpiItemField("prefix") ? { prefix: "$" } : {}),
        ...(hasStatsKpiItemField("suffix") ? { suffix: "K" } : {}),
        ...(hasStatsKpiItemField("accentColor") ? { accentColor: "#2563eb" } : {}),
        ...(hasStatsKpiItemField("trend")
          ? {
              trend: {
                label: "+12% MoM",
                direction: "up",
              },
            }
          : {}),
        ...(hasTask287MetricLinks
          ? {
              link: {
                href: "/case-studies/growth",
                label: "See growth story",
              },
            }
          : {}),
      },
      {
        id: "kpi-2",
        value: "99.9",
        label: "Uptime",
        description: "Stable platform",
        icon: "⏱",
        ...(hasTask287MetricLinks
          ? {
              link: {
                href: "javascript:alert(1)",
                label: "Unsafe",
              },
            }
          : {}),
      },
      {
        id: "kpi-3",
        value: "3",
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
      ...(hasStatsKpiStyleField("valueSize") ? { valueSize: "lg" } : {}),
      ...(hasStatsKpiStyleField("descriptionColor") ? { descriptionColor: "#475569" } : {}),
      ...(hasStatsKpiStyleField("sectionBackground") ? { sectionBackground: "#f8fafc" } : {}),
      ...(hasStatsKpiStyleField("maxWidth") ? { maxWidth: "full" } : {}),
      ...(hasStatsKpiStyleField("padding") ? { padding: "lg" } : {}),
      ...(hasStatsKpiStyleField("minHeight") ? { minHeight: "compact" } : {}),
      ...(hasStatsKpiStyleField("iconSize") ? { iconSize: "lg" } : {}),
      ...(hasStatsKpiStyleField("iconSurface") ? { iconSurface: "#fff7ed" } : {}),
      ...(hasStatsKpiStyleField("iconBorderColor") ? { iconBorderColor: "#ea580c" } : {}),
    },
  };

  expect(() =>
    normalizeWidgetBlock({
      id: "stats-kpi-1",
      type: "stats-kpi",
      variant: "split-highlight",
      data: expandedData as StatsKpiData,
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);

  if (hasTask287ExpandedSchema || hasTask287MetricLinks) {
    const normalized = normalizeStatsKpiData(expandedData as StatsKpiData) as StatsKpiData & {
      items: Array<Record<string, unknown>>;
      style?: Record<string, unknown>;
    };
    const html = renderToString(<StatsKpiBlock data={normalized} variant="cards" />);

    if (hasStatsKpiStyleField("valueSize")) {
      expect(normalized.style?.valueSize).toBe("lg");
      expect(html).toContain('data-stats-kpi-value-size="lg"');
    }
    if (hasStatsKpiStyleField("descriptionColor")) {
      expect(normalized.style?.descriptionColor).toBe("#475569");
      expect(html).toContain("#475569");
    }
    if (hasStatsKpiStyleField("sectionBackground")) {
      expect(normalized.style?.sectionBackground).toBe("#f8fafc");
      expect(html).toContain("#f8fafc");
    }
    if (hasStatsKpiStyleField("maxWidth")) {
      expect(normalized.style?.maxWidth).toBe("full");
    }
    if (hasStatsKpiStyleField("padding")) {
      expect(normalized.style?.padding).toBe("lg");
    }
    if (hasStatsKpiStyleField("minHeight")) {
      expect(normalized.style?.minHeight).toBe("compact");
    }
    if (hasStatsKpiStyleField("iconSize")) {
      expect(normalized.style?.iconSize).toBe("lg");
    }
    if (hasStatsKpiStyleField("iconSurface")) {
      expect(normalized.style?.iconSurface).toBe("#fff7ed");
      expect(html).toContain("#fff7ed");
    }
    if (hasStatsKpiStyleField("iconBorderColor")) {
      expect(normalized.style?.iconBorderColor).toBe("#ea580c");
      expect(html).toContain("#ea580c");
    }
    if (hasStatsKpiItemField("prefix")) {
      expect(normalized.items[0]?.prefix).toBe("$");
    }
    if (hasStatsKpiItemField("suffix")) {
      expect(normalized.items[0]?.suffix).toBe("K");
    }
    if (hasStatsKpiItemField("prefix") && hasStatsKpiItemField("suffix")) {
      expect(html).toContain("$120K");
    }
    if (hasStatsKpiItemField("accentColor")) {
      expect(normalized.items[0]?.accentColor).toBe("#2563eb");
      expect(html).toContain("#2563eb");
    }
    if (hasStatsKpiItemField("trend")) {
      expect(normalized.items[0]?.trend).toEqual(
        expect.objectContaining({
          label: "+12% MoM",
          direction: "up",
        })
      );
      expect(html).toContain("+12% MoM");
      expect(html).toContain('data-stats-kpi-trend-direction="up"');
    }
    if (hasTask287MetricLinks) {
      expect(normalized.items[0]?.link).toEqual(
        expect.objectContaining({
          href: "/case-studies/growth",
        })
      );
      expect(html).toContain('href="/case-studies/growth"');
      expect(html).not.toContain("javascript:alert(1)");
    }
  }
});

test("stats kpi cleared card surfaces omit card background and border styles", () => {
  const normalized = normalizeStatsKpiData({
    ...statsKpiDefaults,
    style: {},
  });
  const html = renderToString(<StatsKpiBlock data={normalized} variant="cards" />);
  const inlineHtml = renderToString(<StatsKpiBlock data={normalized} variant="inline" />);

  expect(normalized.style?.cardBackground).toBeUndefined();
  expect(normalized.style?.cardBorderColor).toBeUndefined();
  expect(html).not.toContain("background-color:");
  expect(html).not.toContain("border-color:");
  expect(inlineHtml).toContain('data-stats-kpi-variant="inline"');
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

  expectHtmlToContainOneOf(html, ["Stats layout", "Cards", "Split Highlight"]);
  expectHtmlToContainOneOf(html, ["Metric count", "Metrics count"]);

  if (hasTask287ExpandedSchema) {
    expectHtmlToContainOneOf(html, ["Proof in numbers", "Title"]);
    expectHtmlToContainOneOf(html, ["Projects launched", "Metric 1 label"]);
    expectHtmlToContainOneOf(html, ["🚀", "Metric 1 icon"]);
  } else {
    expect(html).toContain("Primary metric values");
  }
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
  expectHtmlToContainOneOf(html, ["Metrics content and order", "Metrics and links"]);

  if (hasTask287ExpandedSchema) {
    expectHtmlToContainOneOf(html, ["Typography and colors", "Text and value styling"]);
    expectHtmlToContainOneOf(html, ["Card surfaces", "Surface styling"]);
    expectHtmlToContainOneOf(html, ["Icon styling", "Icon style"]);
    expectHtmlToContainOneOf(html, ["Layout display options", "Section layout"]);
  } else {
    expect(html).toContain("Typography and colors");
    expect(html).toContain("Layout display options");
  }
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
