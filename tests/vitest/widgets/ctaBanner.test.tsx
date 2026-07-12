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
  CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH,
  CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN,
  createCtaBannerWidget,
  ctaBannerDefaults,
  ctaBannerSchema,
  CtaBannerBlock,
  normalizeCtaBannerData,
  parseCtaBannerBackgroundGradient,
  resolveCtaBannerActionRenderState,
  resolveCtaBannerVariant,
  resolveCtaBannerVariantPresentation,
  type CtaBannerData,
} from "../../../core/widgets/core/ctaBanner";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import {
  CTA_BANNER_GRADIENT_CONSUMER_CASES,
  CTA_BANNER_GRADIENT_EXACT_CAP,
  CTA_BANNER_SIMPLE_COLOR_FIELDS,
} from "./ctaBannerColorConsumerTable";

const StubEditor: ComponentType<WidgetEditorProps<CtaBannerData>> = () => null;

test("CTA consumer tables are deeply runtime-frozen and pin the independent cap", () => {
  expect(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(96);
  expect(Object.isFrozen(CTA_BANNER_SIMPLE_COLOR_FIELDS)).toBe(true);
  for (const field of CTA_BANNER_SIMPLE_COLOR_FIELDS) {
    expect(Object.isFrozen(field), field).toBe(true);
  }
  expect(Object.isFrozen(CTA_BANNER_GRADIENT_CONSUMER_CASES)).toBe(true);
  for (const entry of CTA_BANNER_GRADIENT_CONSUMER_CASES) {
    expect(Object.isFrozen(entry), entry.id).toBe(true);
  }
});

test("CTA gradient owner preserves its bounded legacy grammar byte-for-byte", () => {
  for (const entry of CTA_BANNER_GRADIENT_CONSUMER_CASES) {
    const parsed = parseCtaBannerBackgroundGradient(entry.raw);
    expect(parsed?.normalized, entry.id).toBe(entry.normalized);
    if (entry.normalized !== undefined) {
      expect(parsed?.start).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(parsed?.end).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  }

  expect(CTA_BANNER_GRADIENT_EXACT_CAP).toHaveLength(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH);
  expect(
    new RegExp(CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN).test(
      CTA_BANNER_GRADIENT_CONSUMER_CASES[1]!.raw as string
    )
  ).toBe(true);
  expect(ctaBannerSchema.properties.background.properties.gradient.anyOf).toHaveLength(2);
});

test("CTA gradient table is reused by schema, normalizer, and final renderer", () => {
  clearWidgets();
  registerWidget(
    createCtaBannerWidget({ wizard: StubEditor, visual: StubEditor, advanced: StubEditor })
  );

  for (const entry of CTA_BANNER_GRADIENT_CONSUMER_CASES) {
    const data = {
      ...ctaBannerDefaults,
      background: {
        ...ctaBannerDefaults.background,
        gradient: entry.raw as string,
      },
    };
    const validate = () =>
      normalizeWidgetBlock({
        id: `cta-gradient-${entry.id}`,
        type: "cta-banner",
        variant: "centered",
        data,
      });
    if (entry.schemaAccepted) {
      expect(validate, `schema:${entry.id}`).not.toThrow();
    } else {
      expect(validate, `schema:${entry.id}`).toThrow("widget_schema_invalid");
    }

    expect(normalizeCtaBannerData(data).background?.gradient, `normalize:${entry.id}`).toBe(
      entry.normalized
    );
    const html = renderToString(<CtaBannerBlock data={data} variant="centered" />);
    if (entry.normalized !== undefined) {
      expect(html, `render:${entry.id}`).toContain(entry.normalized);
    } else if (typeof entry.raw === "string" && entry.raw.length > 0) {
      expect(html, `render-reject:${entry.id}`).not.toContain(entry.raw);
    }
  }
});

test("CTA simple color fields share inherited canonical normalization and render defense", () => {
  const style = Object.fromEntries(
    CTA_BANNER_SIMPLE_COLOR_FIELDS.map((field, index) => [
      field,
      index % 2 === 0 ? " CURRENTCOLOR " : " INHERIT ",
    ])
  ) as NonNullable<CtaBannerData["style"]>;
  const normalized = normalizeCtaBannerData({
    ...ctaBannerDefaults,
    style,
    background: { color: " CURRENTCOLOR ", gradient: "linear-gradient(-1.5deg, #abcde, #ABCDEF7)" },
  });

  for (const [index, field] of CTA_BANNER_SIMPLE_COLOR_FIELDS.entries()) {
    expect(normalized.style?.[field]).toBe(index % 2 === 0 ? "currentColor" : "inherit");
  }
  expect(normalized.background).toMatchObject({
    color: "currentColor",
    gradient: "linear-gradient(-1.5deg, #abcde, #ABCDEF7)",
  });

  const html = renderToString(<CtaBannerBlock data={normalized} variant="centered" />);
  expect(html).toContain("currentColor");
  expect(html).toContain("inherit");
  expect(html).toContain("linear-gradient(-1.5deg, #abcde, #ABCDEF7)");

  const rejected = normalizeCtaBannerData({
    style: Object.fromEntries(
      CTA_BANNER_SIMPLE_COLOR_FIELDS.map((field) => [field, "\u00a0#fff"])
    ) as NonNullable<CtaBannerData["style"]>,
    background: { color: "rgb(256, 0, 0)", gradient: "linear-gradient(1deg, #abc, url(x))" },
  });
  expect(Object.values(rejected.style ?? {})).not.toContain("\u00a0#fff");
  expect(rejected.background?.gradient).toBeUndefined();
});

test("cta banner renders defaults with accessible ids and runtime markers", () => {
  const html = renderToString(
    <CtaBannerBlock data={ctaBannerDefaults} variant="centered" blockId="cta-1" />
  );

  expect(html).toContain(ctaBannerDefaults.content?.title ?? "");
  expect(html).toContain('aria-labelledby="cta-1-cta-title"');
  expect(html).toContain('data-cta-banner-variant="centered"');
  expect(html).toContain('data-cta-banner-presentation="centered"');
  expect(html).toContain('data-cta-banner-padding="md"');
  expect(html).toContain('data-cta-banner-border-width="1"');
  expect(html).toContain('data-cta-banner-motion="none"');
  expect(html).toContain('data-cta-banner-badge="true"');
  expect(html).toContain('data-cta-button="primary"');
  expect(html).toContain('data-cta-button="secondary"');
  expect(html).not.toContain('data-cta-button="tertiary"');
});

test("cta banner with-badge presentation is visually distinct from centered", () => {
  const centered = renderToString(
    <CtaBannerBlock data={ctaBannerDefaults} variant="centered" blockId="cta-centered" />
  );
  const withBadge = renderToString(
    <CtaBannerBlock data={ctaBannerDefaults} variant="with-badge" blockId="cta-badge" />
  );

  expect(resolveCtaBannerVariantPresentation("with-badge", true)).toEqual({
    variant: "with-badge",
    presentation: "badge-panel",
    badgeState: "visible",
  });
  expect(resolveCtaBannerVariantPresentation("with-badge", false)).toEqual({
    variant: "with-badge",
    presentation: "badge-panel",
    badgeState: "missing",
  });
  expect(centered).toContain('data-cta-banner-presentation="centered"');
  expect(withBadge).toContain('data-cta-banner-presentation="badge-panel"');
  expect(withBadge).toContain("max-w-2xl rounded-2xl border border-current/15");
  expect(centered).not.toContain("max-w-2xl rounded-2xl border border-current/15");
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
          gradient: "linear-gradient(-1.5deg, #0f172, #475569a)",
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

test("cta banner renders disabled guidance when an enabled CTA has label but no safe destination", () => {
  const html = renderToString(
    <CtaBannerBlock
      data={{
        ...ctaBannerDefaults,
        actions: {
          primaryCta: {
            label: "Start now",
            href: "",
            enabled: true,
          },
          secondaryCta: {
            label: "Talk",
            href: "/talk",
            enabled: true,
          },
          tertiaryCta: {
            label: "Maybe later",
            href: "",
            enabled: true,
          },
        },
      }}
      variant="centered"
      blockId="cta-missing-destination"
    />
  );

  expect(
    resolveCtaBannerActionRenderState({ label: "Start now", href: "", enabled: true })
  ).toEqual({
    render: "missing_destination",
  });
  expect(resolveCtaBannerActionRenderState({ label: "", href: "/start", enabled: true })).toEqual({
    render: "hidden",
    reason: "missing_label",
  });
  expect(html).toContain('data-cta-button="primary"');
  expect(html).toContain('data-cta-button-state="missing-destination"');
  expect(html).toContain("Destination required");
  expect(html).toContain('data-cta-button="secondary"');
  expect(html).toContain('data-cta-button-state="active"');
  expect(html).toContain('data-cta-button="tertiary"');
  expect(html).not.toContain('href=""');
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
  expect(html).toContain('data-widget-control-readonly="true"');
  expect(html).toContain("Daily CTA editing happens in Visual");
  expect(html).toContain("Centered");
  expect(html).not.toContain("Primary CTA label");
  expect(html).not.toContain("Primary CTA destination");
  expect(html).not.toContain("Enable secondary CTA");
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
  expect(html).toContain("Colors and Borders");
  expect(html).toContain("CTA Banner palettes");
  expect(html).toContain("Contrast guidance");
  expect(html).toContain('data-widget-editor-section="cta-banner.visual.variant-layout"');
  expect(html).toContain('data-widget-editor-section="cta-banner.visual.content-copy"');
  expect(html).toContain('data-widget-editor-section="cta-banner.visual.actions"');
  expect(html).toContain('data-widget-editor-section="cta-banner.visual.colors-borders"');
  expect(html).toContain('data-widget-editor-section="cta-banner.visual.background-motion"');
  expect(html).toContain("Background and motion");
  expect(html).toContain("Theme default");
  expect(html).toContain('data-widget-control-path="style.text"');
  expect(html).toContain('data-widget-control-path="style.primaryButtonBg"');
  expect(html).toContain('data-widget-control-path="style.border"');
  expect(html).toContain('data-widget-control-path="background.color"');
  expect(html).toContain('data-widget-control-path="background.gradient"');
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
  expect(html).toContain("Runtime summary");
  expect(html).toContain('data-widget-editor-section="cta-banner.advanced.style-diagnostics"');
  expect(html).toContain('data-widget-editor-section="cta-banner.advanced.authoring-boundaries"');
  expect(html).toContain('data-widget-editor-section="cta-banner.advanced.runtime-summary"');
  expect(html).not.toContain("Raw payload snapshot");
  expect(html).not.toContain("<pre");
  expect(html).not.toContain('placeholder="background token"');
  expect(html).not.toContain('placeholder="text token"');
  expect(html).not.toContain('placeholder="border token"');
  expect(html).not.toContain("Tertiary CTA");
});
