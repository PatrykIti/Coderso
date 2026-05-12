import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  CtaBannerAdvancedEditor,
  CtaBannerVisualEditor,
  CtaBannerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/CtaBannerEditors";
import {
  createCtaBannerWidget,
  ctaBannerDefaults,
  CtaBannerBlock,
  normalizeCtaBannerData,
  resolveCtaBannerVariant,
  type CtaBannerData,
} from "../../../core/widgets/core/ctaBanner";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<CtaBannerData>> = () => null;

test("cta banner renders defaults", () => {
  const html = renderToString(<CtaBannerBlock data={ctaBannerDefaults} variant="centered" />);

  expect(html).toContain(ctaBannerDefaults.content?.title ?? "");
  expect(html).toContain('data-cta-banner-variant="centered"');
  expect(html).toContain('data-cta-banner-padding="md"');
});

test("cta banner normalization enforces deterministic style and actions", () => {
  const normalized = normalizeCtaBannerData({
    content: {
      title: "CTA",
    },
    actions: {
      primaryCta: {
        label: "Start",
        href: "/start",
      },
    },
    style: {
      borderWidth: "9" as never,
      radius: "weird" as never,
      padding: "huge" as never,
    },
  });

  expect(normalized.actions?.primaryCta?.label).toBe("Start");
  expect(normalized.actions?.secondaryCta?.label).toBeTruthy();
  expect(normalized.style?.borderWidth).toBe("1");
  expect(normalized.style?.radius).toBe("xl");
  expect(normalized.style?.padding).toBe("md");
  expect(resolveCtaBannerVariant("unknown")).toBe("centered");
});

test("cta banner validator accepts expanded model", () => {
  clearWidgets();
  const widget = createCtaBannerWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "cta-1",
      type: "cta-banner",
      variant: "with-badge",
      data: {
        content: {
          badge: "Limited",
          title: "Ship faster",
          description: "Build and launch with reusable blocks.",
        },
        actions: {
          primaryCta: {
            label: "Start now",
            href: "/start",
          },
          secondaryCta: {
            label: "Contact",
            href: "/contact",
          },
        },
        style: {
          background: "#f8fafc",
          text: "#0f172a",
          border: "#cbd5e1",
          borderWidth: "2",
          radius: "2xl",
          padding: "lg",
          badgeBackground: "#1d4ed8",
          badgeText: "#ffffff",
          primaryButtonBg: "#1d4ed8",
          primaryButtonText: "#ffffff",
          primaryButtonBorder: "transparent",
          secondaryButtonBg: "transparent",
          secondaryButtonText: "#0f172a",
          secondaryButtonBorder: "#cbd5e1",
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("cta banner cleared background surfaces omit container, badge, and button backgrounds", () => {
  const normalized = normalizeCtaBannerData({
    ...ctaBannerDefaults,
    style: {},
  });
  const html = renderToString(<CtaBannerBlock data={normalized} variant="with-badge" />);

  expect(normalized.style?.background).toBeUndefined();
  expect(normalized.style?.badgeBackground).toBeUndefined();
  expect(normalized.style?.primaryButtonBg).toBeUndefined();
  expect(normalized.style?.secondaryButtonBg).toBeUndefined();
  expect(html).toContain('data-cta-banner-variant="with-badge"');
  expect(html).not.toContain("background-color:");
});

test("cta banner strips unsafe CTA hrefs during normalization", () => {
  const normalized = normalizeCtaBannerData({
    ...ctaBannerDefaults,
    actions: {
      primaryCta: { label: "Join", href: "javascript:alert(1)" },
      secondaryCta: { label: "Talk", href: "//evil.example" },
    },
  });

  expect(normalized.actions?.primaryCta?.href).toBe("#");
  expect(normalized.actions?.secondaryCta?.href).toBe("#");

  const html = renderToString(<CtaBannerBlock data={normalized} variant="centered" />);
  expect(html).not.toContain("javascript:alert");
  expect(html).not.toContain("//evil.example");
});

test("cta banner validator rejects unsupported variant", () => {
  clearWidgets();
  registerWidget(
    createCtaBannerWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "cta-2",
      type: "cta-banner",
      variant: "unknown",
      data: ctaBannerDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("cta banner wizard renders onboarding fields", () => {
  const html = renderToString(
    <CtaBannerWizardEditor
      value={ctaBannerDefaults}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Banner layout");
  expect(html).toContain("Headline");
  expect(html).toContain("Primary CTA label");
});

test("cta banner visual renders section-based IA", () => {
  const html = renderToString(
    <CtaBannerVisualEditor
      value={ctaBannerDefaults}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Content copy");
  expect(html).toContain("Actions");
  expect(html).toContain("Colors and button styles");
});

test("cta banner advanced keeps technical-only scope", () => {
  const html = renderToString(
    <CtaBannerAdvancedEditor
      value={ctaBannerDefaults}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Technical style tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Actions");
});
