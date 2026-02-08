import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  LogoCloudAdvancedEditor,
  LogoCloudVisualEditor,
  LogoCloudWizardEditor,
} from "../../../core/admin/ui/widgets/editors/LogoCloudEditors";
import {
  createLogoCloudWidget,
  logoCloudDefaults,
  logoCloudLogoMax,
  LogoCloudBlock,
  normalizeLogoCloudData,
  normalizeLogoCloudLogoCount,
  normalizeLogoCloudLogos,
  type LogoCloudData,
} from "../../../core/widgets/core/logoCloud";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<LogoCloudData>> = () => null;

test("logo cloud renders defaults", () => {
  const html = renderToString(
    <LogoCloudBlock data={logoCloudDefaults} variant="grid" />
  );

  expect(html).toContain(logoCloudDefaults.header?.title ?? "");
  expect(html).toContain('data-logo-cloud-variant="grid"');
  expect(html).toContain('data-logo-cloud-count="6"');
});

test("logo cloud normalization keeps deterministic ids and bounds", () => {
  const logos = normalizeLogoCloudLogos(
    [
      { id: "same", name: "One", href: "#" },
      { id: "same", name: "", href: "#" },
    ],
    2
  );

  expect(logos).toHaveLength(2);
  expect(logos[0]?.id).toBe("same");
  expect(logos[1]?.id).toBe("logo-2");
  expect(logos[1]?.name).toBeTruthy();
  expect(normalizeLogoCloudLogoCount(999)).toBe(logoCloudLogoMax);
  expect(normalizeLogoCloudLogoCount(0)).toBe(1);

  const normalized = normalizeLogoCloudData({ logos: [] });
  expect(normalized.logos).toHaveLength(6);
  expect(normalized.style?.logoHeight).toBe("md");
});

test("logo cloud validator accepts expanded model", () => {
  clearWidgets();
  const widget = createLogoCloudWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "logo-cloud-1",
      type: "logo-cloud",
      variant: "dense",
      data: {
        header: {
          title: "Trusted by partners",
          description: "Build confidence with recognisable logos.",
        },
        logos: [
          {
            id: "logo-a",
            name: "Acme",
            image: "https://cdn.example.com/acme.svg",
            href: "https://acme.example.com",
          },
          {
            id: "logo-b",
            name: "North Labs",
            image: "https://cdn.example.com/north.svg",
            href: "https://north.example.com",
          },
        ],
        style: {
          logoHeight: "lg",
          grayscale: true,
          hoverColor: true,
          gap: "lg",
          alignment: "center",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("logo cloud validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createLogoCloudWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "logo-cloud-2",
      type: "logo-cloud",
      variant: "unknown",
      data: logoCloudDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("logo cloud wizard renders onboarding fields", () => {
  const html = renderToString(
    <LogoCloudWizardEditor
      value={logoCloudDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Logo cloud layout");
  expect(html).toContain("Section title");
  expect(html).toContain("Basic logo names");
});

test("logo cloud visual renders section-based IA", () => {
  const html = renderToString(
    <LogoCloudVisualEditor
      value={logoCloudDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Logos list and links");
  expect(html).toContain("Display style");
});

test("logo cloud advanced keeps technical-only scope", () => {
  const html = renderToString(
    <LogoCloudAdvancedEditor
      value={logoCloudDefaults}
      onChange={() => undefined}
      variant="strip"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Technical layout tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Logos list and links");
});
