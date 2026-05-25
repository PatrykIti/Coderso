import React from "react";
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

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

test("cta banner renders defaults with accessible ids and runtime markers", () => {
  const html = renderToString(
    <CtaBannerBlock data={ctaBannerDefaults} variant="centered" blockId="cta-1" />
  );

  expect(html).toContain(ctaBannerDefaults.content?.title ?? "");
  expect(html).toContain('aria-labelledby="cta-1-cta-title"');
  expect(html).toContain('data-cta-banner-variant="centered"');
  expect(html).toContain('data-cta-banner-padding="md"');
  expect(html).toContain('data-cta-banner-border-width="1"');
  expect(html).toContain('data-cta-banner-motion="none"');
  expect(html).toContain('data-cta-banner-badge="true"');
  expect(html).toContain('data-cta-button="primary"');
  expect(html).toContain('data-cta-button="secondary"');
  expect(html).not.toContain('data-cta-button="tertiary"');
});

test("cta banner normalization enforces deterministic style, action, background, and motion", () => {
  const normalized = normalizeCtaBannerData({
    content: {
      title: "CTA",
      showDescription: false,
    },
    actions: {
      primaryCta: {
        label: "Start",
        href: "/start",
        openInNewTab: true,
        icon: "arrow-right",
      },
      tertiaryCta: {
        label: "Later",
        href: "/later",
      },
    },
    style: {
      borderWidth: "9" as never,
      radius: "weird" as never,
      padding: "huge" as never,
      buttonRadius: "circle" as never,
      primaryButtonSize: "xl" as never,
      secondaryButtonSize: "tiny" as never,
    },
    background: {
      gradient: "radial-gradient(red, blue)",
      media: {
        type: "image",
        src: "javascript:alert(1)",
        fit: "stretch" as never,
        position: "left" as never,
      },
    },
    motion: {
      preset: "zoom" as never,
    },
  });

  expect(normalized.actions?.primaryCta).toMatchObject({
    label: "Start",
    href: "/start",
    openInNewTab: true,
    icon: "arrow-right",
    enabled: true,
  });
  expect(normalized.actions?.secondaryCta?.label).toBeTruthy();
  expect(normalized.actions?.tertiaryCta).toMatchObject({
    label: "Later",
    href: "/later",
    enabled: false,
    icon: "none",
  });
  expect(normalized.style?.borderWidth).toBe("1");
  expect(normalized.style?.radius).toBe("xl");
  expect(normalized.style?.padding).toBe("md");
  expect(normalized.style?.buttonRadius).toBeUndefined();
  expect(normalized.style?.primaryButtonSize).toBe("md");
  expect(normalized.style?.secondaryButtonSize).toBe("md");
  expect(normalized.background?.gradient).toBeUndefined();
  expect(normalized.background?.media).toMatchObject({
    type: "image",
    src: undefined,
    fit: "cover",
    position: "center",
  });
  expect(normalized.motion?.preset).toBe("none");
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
          showDescription: true,
        },
        actions: {
          primaryCta: {
            label: "Start now",
            href: "/start",
            openInNewTab: true,
            icon: "arrow-right",
          },
          secondaryCta: {
            label: "Contact",
            href: "/contact",
            enabled: true,
            icon: "chevron-right",
          },
          tertiaryCta: {
            label: "No thanks",
            href: "/dismiss",
            enabled: true,
            icon: "external-link",
          },
        },
        style: {
          borderWidth: "2",
          radius: "2xl",
          padding: "lg",
          buttonRadius: "pill",
          primaryButtonSize: "lg",
          secondaryButtonSize: "sm",
        },
        background: {
          color: "#f8fafc",
          gradient: "linear-gradient(135deg, #0f172a, #475569)",
          media: {
            type: "image",
            source: "external",
            src: "/hero.jpg",
            fit: "contain",
            position: "top",
          },
        },
        motion: {
          preset: "slide-up",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("cta banner hides empty badge, description, disabled actions, and semantic border when width is zero", () => {
  const html = renderToString(
    <CtaBannerBlock
      data={{
        ...ctaBannerDefaults,
        content: {
          badge: "   ",
          title: "Focused CTA",
          description: "Should stay hidden",
          showDescription: false,
        },
        actions: {
          primaryCta: { label: "Start", href: "/start" },
          secondaryCta: { label: "Talk", href: "/talk", enabled: false },
          tertiaryCta: { label: "Maybe later", href: "/later", enabled: false },
        },
        style: {
          ...ctaBannerDefaults.style,
          borderWidth: "0",
        },
      }}
      variant="with-badge"
      blockId="cta-2"
    />
  );

  expect(html).not.toContain('data-cta-banner-badge="true"');
  expect(html).not.toContain("Should stay hidden");
  expect(html).not.toContain('data-cta-button="secondary"');
  expect(html).not.toContain('data-cta-button="tertiary"');

  const match = html.match(
    /<div class="([^"]*)" style="[^"]*" data-cta-banner-variant="with-badge"/
  );
  expect(match?.[1] ?? "").not.toContain("border");
});

test("cta banner renders safe link attrs, icons, sizing, background layers, and motion", () => {
  const html = renderToString(
    <CtaBannerBlock
      data={{
        ...ctaBannerDefaults,
        content: {
          ...ctaBannerDefaults.content,
          showDescription: true,
        },
        actions: {
          primaryCta: {
            label: "Book demo",
            href: "https://example.com/demo",
            openInNewTab: true,
            icon: "arrow-right",
          },
          secondaryCta: {
            label: "See pricing",
            href: "/pricing",
            icon: "chevron-right",
          },
          tertiaryCta: {
            label: "No thanks",
            href: "/dismiss",
            enabled: true,
            icon: "external-link",
          },
        },
        style: {
          ...ctaBannerDefaults.style,
          buttonRadius: "pill",
          primaryButtonSize: "lg",
          secondaryButtonSize: "sm",
        },
        background: {
          color: "#101820",
          gradient: "linear-gradient(135deg, #0f172a, #475569)",
          media: {
            type: "image",
            source: "external",
            src: "/images/cta-hero.png",
            fit: "contain",
            position: "top",
          },
        },
        motion: {
          preset: "slide-up",
        },
      }}
      variant="split"
      blockId="cta-3"
    />
  );

  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('data-cta-button="tertiary"');
  expect(html).toContain("rounded-full");
  expect(html).toContain("px-5 py-2.5 text-base");
  expect(html).toContain("px-3 py-1.5 text-xs");
  expect(html).toContain("lucide-arrow-right");
  expect(html).toContain("lucide-chevron-right");
  expect(html).toContain("lucide-external-link");
  expect(html).toContain('data-cta-banner-motion="slide-up"');
  expect(html).toContain("motion-safe:slide-in-from-bottom-2");
  expect(html).toContain("background-color:#101820");
  expect(html).toContain(
    "background-image:linear-gradient(135deg, #0f172a, #475569), url(/images/cta-hero.png)"
  );
  expect(html).toContain("background-size:contain");
  expect(html).toContain("background-position:top");
  expect(html).not.toContain("max-w-6xl");
});

test("cta banner strips unsafe CTA hrefs and background media urls during normalization", () => {
  const normalized = normalizeCtaBannerData({
    ...ctaBannerDefaults,
    actions: {
      primaryCta: { label: "Join", href: "javascript:alert(1)" },
      secondaryCta: { label: "Talk", href: "//evil.example" },
      tertiaryCta: { label: "Nope", href: "javascript:alert(2)", enabled: true },
    },
    background: {
      media: {
        type: "image",
        src: "javascript:alert(3)",
      },
    },
  });

  expect(normalized.actions?.primaryCta?.href).toBe("#");
  expect(normalized.actions?.secondaryCta?.href).toBe("#");
  expect(normalized.actions?.tertiaryCta?.href).toBe("");
  expect(normalized.background?.media?.src).toBeUndefined();

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
  expect(html).toContain("Primary CTA destination");
  expect(html).toContain("Enable secondary CTA");
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
  expect(html).toContain("Background and motion");
  expect(html).toContain("Saved custom color");
  expect(html).not.toContain('placeholder="var(--color-text)"');
  expect(html).not.toContain('placeholder="var(--color-primary)"');
  expect(html).not.toContain('placeholder="var(--color-bg)"');
  expect(html).not.toContain('placeholder="var(--color-border)"');
  expect(html).not.toContain('placeholder="var(--color-surface)"');
});

test("cta banner advanced keeps diagnostics read-only", () => {
  const html = renderToString(
    <CtaBannerAdvancedEditor
      value={ctaBannerDefaults}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Style diagnostics");
  expect(html).toContain("Visual owns color editing");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain('placeholder="background token"');
  expect(html).not.toContain('placeholder="text token"');
  expect(html).not.toContain('placeholder="border token"');
  expect(html).not.toContain("Tertiary CTA");
});
