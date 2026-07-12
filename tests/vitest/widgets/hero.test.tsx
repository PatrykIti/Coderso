import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  createHeroWidget,
  HERO_BACKGROUND_GRADIENT_MAX_LENGTH,
  heroDefaults,
  heroEditorContract,
  HeroBlock,
  normalizeHeroBackgroundGradient,
  normalizeHeroData,
  type HeroData,
} from "../../../core/widgets/core/hero";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import { createWidgetRuntimeScriptRegistry } from "../../../core/widgets/runtimeScripts";
import type { WidgetEditorProps, WidgetRenderContext } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
const HERO_DIRECT_COLOR_FIELDS = [
  "textColor",
  "subheadColor",
  "bodyColor",
  "borderColor",
  "mediaBorderColor",
  "primaryButtonBg",
  "primaryButtonText",
  "primaryButtonBorder",
  "secondaryButtonBg",
  "secondaryButtonText",
  "secondaryButtonBorder",
] as const;

test("hero renders defaults", () => {
  const html = renderToString(<HeroBlock data={heroDefaults} variant="centered" />);
  expect(html).toContain(heroDefaults.headline);
});

test("hero pins the independently reviewed composite cap", () => {
  expect(HERO_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(320);
});

test("hero owns one bounded two-stop gradient parser", () => {
  const accepted = [
    ["LINEAR-GRADIENT(0DEG, #ABC, currentcolor)", "linear-gradient(0deg, #abc, currentColor)"],
    ["linear-gradient(1deg, #abcd, #abcdef)", "linear-gradient(1deg, #abcd, #abcdef)"],
    [
      "linear-gradient(2deg, #ABCDEF12, transparent)",
      "linear-gradient(2deg, #abcdef12, transparent)",
    ],
    [
      "linear-gradient(3deg, rgba(1, 2, 3, .5), var(--color-primary))",
      "linear-gradient(3deg, rgba(1, 2, 3, 0.5), var(--color-primary))",
    ],
    [
      "linear-gradient(360deg, RGB(12, 24, 36), HSLA(210, 50%, 40%, 25%))",
      "linear-gradient(360deg, rgb(12, 24, 36), hsla(210, 50%, 40%, 25%))",
    ],
    [
      "linear-gradient(4deg, HSL(210DEG, 50%, 40%), #FFF)",
      "linear-gradient(4deg, hsl(210, 50%, 40%), #fff)",
    ],
  ] as const;
  for (const [raw, canonical] of accepted) {
    expect(normalizeHeroBackgroundGradient(raw)).toBe(canonical);
  }

  const terminal = "linear-gradient(1deg, #abc, var(--color-primary))";
  const exactCap = `${" ".repeat(HERO_BACKGROUND_GRADIENT_MAX_LENGTH - terminal.length)}${terminal}`;
  expect(exactCap).toHaveLength(HERO_BACKGROUND_GRADIENT_MAX_LENGTH);
  expect(normalizeHeroBackgroundGradient(exactCap)).toBe(terminal);
  expect(normalizeHeroBackgroundGradient(` ${exactCap}`)).toBeUndefined();

  for (const value of [
    "linear-gradient(-1deg, #abc, #def)",
    "linear-gradient(+1deg, #abc, #def)",
    "linear-gradient(1.5deg, #abc, #def)",
    "linear-gradient(361deg, #abc, #def)",
    "linear-gradient(1deg, inherit, #def)",
    "linear-gradient(1deg, #abc, #def, #fff)",
    "linear-gradient(1deg, url(x), #def)",
    "linear-gradient(1deg, #abc 20%, #def)",
    "linear-gradient(1deg, rgb(999, 0, 0), #def)",
    "linear-gradient(1deg, #abc, #def",
    "linear-gradient(1deg,\t#abc, #def)",
    "linear-gradient(1deg,\u001f#abc, #def)",
    "linear-gradient(1deg,\u0085#abc, #def)",
    "linear-gradient(1deg,\u00a0#abc, #def)",
    "linear-gradient(1deg,\u2003#abc, #def)",
  ]) {
    expect(normalizeHeroBackgroundGradient(value), value).toBeUndefined();
  }
});

test("hero direct colors accept inherited values while nested overlays reject inherit", () => {
  const style = Object.fromEntries(
    HERO_DIRECT_COLOR_FIELDS.map((field, index) => [
      field,
      index % 2 === 0 ? " CURRENTCOLOR " : " INHERIT ",
    ])
  ) as NonNullable<HeroData["style"]>;
  const normalized = normalizeHeroData({
    ...heroDefaults,
    style,
    media: { type: "image", src: "/hero.jpg", overlay: " currentcolor " },
    background: {
      color: " inherit ",
      gradient: "linear-gradient(15deg, currentcolor, var(--color-primary))",
      media: { type: "image", src: "/bg.jpg", overlay: " inherit " },
    },
  });

  for (const [index, field] of HERO_DIRECT_COLOR_FIELDS.entries()) {
    expect(normalized.style?.[field]).toBe(index % 2 === 0 ? "currentColor" : "inherit");
  }
  expect(normalized.media?.overlay).toBe("currentColor");
  expect(normalized.background).toMatchObject({
    color: "inherit",
    gradient: "linear-gradient(15deg, currentColor, var(--color-primary))",
  });
  expect(normalized.background?.media?.overlay).toBeUndefined();

  const html = renderToString(<HeroBlock data={normalized} variant="split" />);
  expect(html).toContain("currentColor");
  expect(html).toContain("linear-gradient(15deg, currentColor, var(--color-primary))");
  expect(html).not.toContain("linear-gradient(inherit, inherit)");
});

test("hero schema accepts currentColor nested stops and rejects inherit/control composites", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({ wizard: StubEditor, visual: StubEditor, advanced: StubEditor })
  );
  expect(() =>
    normalizeWidgetBlock({
      id: "hero-color-schema-valid",
      type: "hero",
      variant: "split",
      data: {
        headline: "Schema",
        style: Object.fromEntries(
          HERO_DIRECT_COLOR_FIELDS.map((field, index) => [
            field,
            index % 2 === 0 ? "currentColor" : "inherit",
          ])
        ),
        media: { type: "image", overlay: "currentColor" },
        background: {
          color: "inherit",
          gradient: "linear-gradient(1deg, currentColor, #abcd)",
          media: { type: "image", overlay: "currentColor" },
        },
      },
    })
  ).not.toThrow();

  for (const data of [
    { headline: "Schema", media: { type: "image", overlay: "inherit" } },
    {
      headline: "Schema",
      background: { media: { type: "image", overlay: "inherit" } },
    },
    {
      headline: "Schema",
      background: { gradient: ` ${" ".repeat(HERO_BACKGROUND_GRADIENT_MAX_LENGTH)}#abc` },
    },
    {
      headline: "Schema",
      background: { gradient: "linear-gradient(1deg,\u00a0#abc, #def)" },
    },
  ]) {
    expect(() =>
      normalizeWidgetBlock({
        id: `hero-color-schema-${JSON.stringify(data).length}`,
        type: "hero",
        variant: "split",
        data,
      })
    ).toThrow(/widget_schema_invalid/);
  }
});

test("hero spacing falls back to defaults when spacing is empty", () => {
  const html = renderToString(
    <HeroBlock data={{ ...heroDefaults, spacing: {} }} variant="centered" />
  );
  expect(html).toContain("padding-top:3rem");
  expect(html).toContain("padding-bottom:3rem");
});

test("hero validator rejects invalid variant", () => {
  clearWidgets();
  const widget = createHeroWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);

  expect(() =>
    normalizeWidgetBlock({
      id: "hero-1",
      type: "hero",
      variant: "invalid",
      data: heroDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("hero validator accepts extended schema", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "hero-2",
      type: "hero",
      variant: "split",
      data: {
        ...heroDefaults,
        badge: {
          enabled: true,
          label: "New",
          href: "/new",
          prefix: "Beta",
          tone: "primary",
          placement: "above-headline",
        },
        background: {
          color: "#fff",
          gradient: "linear-gradient(#fff,#eee)",
          media: {
            type: "image",
            source: "library",
            assetId: "bg-asset-1",
            src: "https://example.com/bg.jpg",
          },
        },
        spacing: { paddingTop: "lg", paddingBottom: "xl" },
        layout: { align: "left", maxWidth: "2xl", contentWidth: "md" },
        media: {
          type: "image",
          source: "library",
          assetId: "asset-1",
          src: "https://example.com/hero.jpg",
        },
      },
    })
  ).not.toThrow();
});

test("hero exposes a strict v2 editor ownership contract", () => {
  const widget = createHeroWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(validation.valid).toBe(true);
  expect(widget.editorContract).toBe(heroEditorContract);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "hero.wizard.goal-structure",
    "hero.wizard.starter-copy",
    "hero.wizard.primary-action",
    "hero.variant-presets",
    "hero.badge-headline",
    "hero.cta",
    "hero.rich-copy-social-proof",
    "hero.media",
    "hero.layout-spacing",
    "hero.typography",
    "hero.appearance",
    "hero.colors-borders",
    "hero.background",
    "hero.advanced.layout-summary",
    "hero.advanced.style-summary",
    "hero.advanced.media-diagnostics",
    "hero.advanced.accessibility-diagnostics",
    "hero.advanced.runtime-summary",
    "hero.advanced.contract-summary",
  ]);
  expect(widget.editorContract?.sections[0]?.writablePaths).toEqual([]);
  expect(
    widget.editorContract?.sections.find(
      (section) => section.id === "hero.advanced.runtime-summary"
    )?.readOnlyPaths
  ).toEqual(["variant", "primaryCta.href", "media.src", "richBody"]);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "advanced")
      .every((section) => section.writablePaths.length === 0)
  ).toBe(true);
});

test("hero renders slot content blocks", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "hero-parent",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Parent" },
        slots: {
          content: [
            {
              id: "hero-child",
              type: "hero",
              variant: "centered",
              data: { ...heroDefaults, headline: "Child" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Parent");
  expect(html).toContain("Child");
});

test("hero preserves saved single-CTA state through widget normalization", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const normalized = normalizeWidgetBlock({
    id: "hero-single-cta",
    type: "hero",
    variant: "centered",
    data: {
      headline: "Single action hero",
      primaryCta: { label: "Only CTA", href: "/start" },
    },
  });

  expect(normalized.data.secondaryCta).toBeUndefined();

  const html = renderToString(
    <HeroBlock data={normalized.data as HeroData} variant={normalized.variant ?? "centered"} />
  );
  expect(html).toContain("Only CTA");
  expect(html).not.toContain("Learn more");
});

test("hero shows media placeholder when type selected without url", () => {
  const html = renderToString(
    <HeroBlock data={{ ...heroDefaults, media: { type: "image" } }} variant="split" />
  );

  expect(html).toContain("Add media URL");
});

test("hero split shows placeholder when media type is none", () => {
  const html = renderToString(<HeroBlock data={heroDefaults} variant="split" />);

  expect(html).toContain("Select media type");
});

test("hero media-left uses reversed layout", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/hero.jpg" } }}
      variant="media-left"
    />
  );

  expect(html).toContain("md:flex-row-reverse");
});

test("hero media-center keeps centered content actions even when legacy align is left", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        layout: { ...heroDefaults.layout, align: "left" },
        media: { type: "image", src: "/hero.jpg", alt: "Hero showcase" },
      }}
      variant="media-center"
    />
  );

  expect(html).toContain("text-center");
  expect(html).toContain("flex w-full flex-wrap items-center gap-3 justify-center");
});

test("hero applies bounded full-bleed height and mobile media visibility runtime output", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        layout: {
          ...heroDefaults.layout,
          height: "large",
          bleed: "full-bleed",
        },
        responsive: {
          hideMediaOnMobile: true,
        },
        media: {
          type: "image",
          src: "/hero.jpg",
          alt: "Hero showcase",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain("min-h-[80vh]");
  expect(html).toContain("width:100vw");
  expect(html).toContain("margin-left:calc(50% - 50vw)");
  expect(html).toContain("margin-right:calc(50% - 50vw)");
  expect(html).toContain("hidden md:block");
});

test("hero centered uses selected image as background", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/hero.jpg" } }}
      variant="centered"
    />
  );

  expect(html).toContain('src="/hero.jpg"');
  expect(html).toContain('fetchPriority="high"');
  expect(html).toContain('sizes="100vw"');
});

test("hero applies deterministic image loading policy by variant", () => {
  const splitHtml = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/split.jpg", alt: "Split" } }}
      variant="split"
    />
  );
  const mediaLeftHtml = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/left.jpg", alt: "Left" } }}
      variant="media-left"
    />
  );
  const mediaCenterHtml = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/center.jpg", alt: "Center" } }}
      variant="media-center"
    />
  );

  expect(splitHtml).toContain('loading="eager"');
  expect(splitHtml).toContain('fetchPriority="high"');
  expect(splitHtml).toContain('sizes="(min-width: 768px) 50vw, 100vw"');
  expect(mediaLeftHtml).toContain('loading="lazy"');
  expect(mediaLeftHtml).toContain('fetchPriority="auto"');
  expect(mediaLeftHtml).toContain('sizes="(min-width: 768px) 50vw, 100vw"');
  expect(mediaCenterHtml).toContain('loading="eager"');
  expect(mediaCenterHtml).toContain('fetchPriority="high"');
  expect(mediaCenterHtml).toContain('sizes="100vw"');
});

test("hero keeps gradient and overlay layers above centered background media", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        media: {
          type: "image",
          src: "/hero.jpg",
          alt: "Hero background",
          overlay: "rgba(15, 23, 42, 0.35)",
        },
        background: {
          color: "#020617",
          gradient: "linear-gradient(135deg, rgba(2, 6, 23, 0.1), rgba(2, 6, 23, 0.65))",
        },
      }}
      variant="centered"
    />
  );

  expect(html).toContain('src="/hero.jpg"');
  expect(html).toContain("linear-gradient(135deg, rgba(2, 6, 23, 0.1), rgba(2, 6, 23, 0.65))");
  expect(html).toContain('data-hero-background-overlay="true"');
  expect(html).toContain("rgba(15, 23, 42, 0.35)");
});

test("hero renders explicit background image overlay as a valid layered background image", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        background: {
          color: "#020617",
          gradient: "linear-gradient(135deg, rgba(2, 6, 23, 0.1), rgba(2, 6, 23, 0.65))",
          media: {
            type: "image",
            src: "/hero-bg.jpg",
            overlay: "rgba(0, 0, 255, 0.25)",
          },
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain(
    "background-image:linear-gradient(rgba(0, 0, 255, 0.25), rgba(0, 0, 255, 0.25))"
  );
  expect(html).toContain("url(/hero-bg.jpg)");
  expect(html).not.toContain("background-image:rgba(0, 0, 255, 0.25)");
});

test("hero applies style tokens to runtime output", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        media: { type: "image", src: "/hero.jpg" },
        style: {
          headlineSize: "5xl",
          textColor: "#112233",
          borderColor: "#445566",
          borderWidth: "2",
          borderRadius: "xl",
          mediaRadius: "lg",
          mediaBorderWidth: "3",
          cardShadow: "soft",
          mediaShadow: "strong",
          buttonShadow: "medium",
          fontFamily: "serif",
          headlineWeight: "bold",
          bodyWeight: "normal",
          motion: "slide-up",
          primaryButtonBg: "#224466",
          primaryButtonText: "#ffffff",
          secondaryButtonBorder: "#123456",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain("text-5xl");
  expect(html).toContain("rounded-xl");
  expect(html).toContain("rounded-lg");
  expect(html).toContain("shadow-sm");
  expect(html).toContain("shadow-xl");
  expect(html).toContain("shadow-md");
  expect(html).toContain("font-serif");
  expect(html).toContain("font-bold");
  expect(html).toContain("font-normal");
  expect(html).toContain("motion-safe:slide-in-from-bottom-2");
  expect(html).toContain("color:#112233");
  expect(html).toContain("border-width:2px");
  expect(html).toContain("border-width:3px");
  expect(html).toContain("border-color:#445566");
  expect(html).toContain("background:#224466");
});

test("hero renders background video when configured", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        background: {
          color: "#000000",
          gradient: "linear-gradient(120deg, #000000, #111111)",
          media: {
            type: "video",
            source: "external",
            src: "https://example.com/bg.mp4",
            posterSrc: "/bg-poster.jpg",
            title: "Ambient background video",
            description: "Gentle looping ambient video",
          },
        },
      }}
      variant="centered"
    />
  );

  expect(html).toContain('src="https://example.com/bg.mp4"');
  expect(html).toContain('poster="/bg-poster.jpg"');
  expect(html).toContain('title="Ambient background video"');
  expect(html).toContain('aria-description="Gentle looping ambient video"');
  expect(html).toContain("autoPlay");
  expect(html).toContain("object-cover");
});

test("hero renders inline video poster and metadata", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        media: {
          type: "video",
          src: "https://example.com/demo.mp4",
          posterSrc: "/hero-poster.jpg",
          title: "Hero walkthrough",
          description: "Video overview of the main workflow",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain('src="https://example.com/demo.mp4"');
  expect(html).toContain('poster="/hero-poster.jpg"');
  expect(html).toContain('title="Hero walkthrough"');
  expect(html).toContain('aria-description="Video overview of the main workflow"');
});

test("hero keeps inline video overlays decorative so controls remain interactive", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        media: {
          type: "video",
          src: "https://example.com/demo.mp4",
          overlay: "rgba(15, 23, 42, 0.35)",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain('data-hero-inline-media-overlay="true"');
  expect(html).toContain("pointer-events-none absolute inset-0");
});

test("hero clearable background and CTA fields omit runtime styles", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        background: {
          color: undefined,
          gradient: undefined,
          media: {
            type: "image",
            src: "/hero-bg.jpg",
            overlay: undefined,
          },
        },
        style: {
          primaryButtonBg: undefined,
          secondaryButtonBg: undefined,
        },
      }}
      variant="centered"
    />
  );

  expect(html).toContain("background-image:url(/hero-bg.jpg)");
  expect(html).not.toContain("linear-gradient");
  expect(html).not.toContain("data-hero-background-overlay");
  expect(html).not.toContain("background:transparent");
});

test("hero normalizer strips unsafe CTA hrefs and keeps safe badge text", () => {
  const normalized = normalizeHeroData({
    ...heroDefaults,
    badge: {
      enabled: true,
      label: "Launch week",
      href: "javascript:alert(1)",
      prefix: "New",
      tone: "warning",
    },
    primaryCta: {
      label: "Start",
      href: "javascript:alert(2)",
    },
    secondaryCta: {
      label: "Docs",
      href: "//evil.example",
    },
  });

  expect(normalized.badge).toEqual(
    expect.objectContaining({
      label: "Launch week",
      href: undefined,
      prefix: "New",
      tone: "warning",
    })
  );
  expect(normalized.primaryCta).toBeUndefined();
  expect(normalized.secondaryCta).toBeUndefined();
});

test("hero normalizer bounds new tokens and trims social proof media", () => {
  const normalized = normalizeHeroData({
    ...heroDefaults,
    layout: {
      ...heroDefaults.layout,
      height: "oversized" as never,
      bleed: "edge" as never,
    },
    style: {
      cardShadow: "bad-shadow" as never,
      mediaShadow: "medium",
      buttonShadow: "strong",
      fontFamily: "custom-font" as never,
      headlineWeight: "strange" as never,
      bodyWeight: "heavy" as never,
      motion: "bounce" as never,
    },
    media: {
      type: "video",
      src: " /demo.mp4 ",
      alt: "Decorative",
      title: " Demo clip ",
    },
    socialProof: {
      enabled: true,
      rating: " ",
      reviewCount: " 2,000+ ",
      label: " Trusted by teams ",
      avatars: [
        { src: " /avatar-a.jpg ", alt: " Reviewer A " },
        {
          source: "library",
          assetId: " asset-avatar ",
          src: " /avatar-b.jpg ",
          alt: " ",
        },
        { src: "   ", alt: "Skip me" },
      ],
    },
  } as HeroData);

  expect(normalized.layout).toMatchObject({
    height: "auto",
    bleed: "contained",
  });
  expect(normalized.style).toMatchObject({
    cardShadow: "none",
    mediaShadow: "medium",
    buttonShadow: "strong",
    fontFamily: "inherit",
    headlineWeight: "semibold",
    bodyWeight: "normal",
    motion: "none",
  });
  expect(normalized.media).toMatchObject({
    type: "video",
    src: "/demo.mp4",
    title: "Demo clip",
    alt: undefined,
  });
  expect(normalized.socialProof).toEqual({
    enabled: true,
    rating: undefined,
    reviewCount: "2,000+",
    label: "Trusted by teams",
    avatars: [
      { source: "external", assetId: undefined, src: "/avatar-a.jpg", alt: "Reviewer A" },
      { source: "library", assetId: "asset-avatar", src: "/avatar-b.jpg", alt: undefined },
    ],
  });
});

test("hero normalizer keeps the default body weight when the style omits it", () => {
  const normalized = normalizeHeroData({
    ...heroDefaults,
    style: {
      ...heroDefaults.style,
      bodyWeight: undefined,
    },
  } as HeroData);

  expect(normalized.style?.bodyWeight).toBe("normal");
});

test("hero renders sanitized rich copy and social proof", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        richHeadline:
          '<strong>Build</strong> faster <a href="https://example.com" target="_blank" onclick="alert(1)">now</a><script>alert(2)</script>',
        richBody:
          '<p>Trusted by <em>delivery teams</em>.</p><img src="/x.jpg" onerror="alert(1)" />',
        socialProof: {
          enabled: true,
          rating: "4.9/5",
          reviewCount: "2,000+ reviews",
          label: "Trusted by product and ops teams.",
          avatars: [{ src: "/avatar-1.jpg", alt: "Reviewer avatar" }],
        },
      }}
      variant="centered"
    />
  );

  expect(html).toContain("<strong>Build</strong>");
  expect(html).toContain('href="https://example.com"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("onclick=");
  expect(html).not.toContain("onerror=");
  expect(html).toContain('data-widget-part="hero.social-proof"');
  expect(html).toContain('src="/avatar-1.jpg"');
  expect(html).toContain("2,000+ reviews");
});

test("hero renders badge and omits unsafe links from runtime output", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        badge: {
          enabled: true,
          label: "Launch week",
          href: "javascript:alert(1)",
          prefix: "New",
          tone: "primary",
          placement: "inline-headline",
        },
        primaryCta: {
          label: "Start",
          href: "javascript:alert(2)",
        },
        secondaryCta: {
          label: "Docs",
          href: "#docs",
        },
      }}
      variant="centered"
    />
  );

  expect(html).toContain("Launch week");
  expect(html).toContain("New");
  expect(html).toContain('data-widget-part="hero.badge"');
  expect(html).toContain('href="#docs"');
  expect(html).not.toContain("javascript:alert");
});

test("hero round-trips style.tilt:'subtle' and 'strong'", () => {
  const subtle = normalizeHeroData({
    ...heroDefaults,
    style: { tilt: "subtle" },
  } as HeroData);
  expect(subtle.style?.tilt).toBe("subtle");

  const strong = normalizeHeroData({
    ...heroDefaults,
    style: { tilt: "strong" },
  } as HeroData);
  expect(strong.style?.tilt).toBe("strong");
});

test("hero omits style.tilt:'none' (present-only)", () => {
  const normalized = normalizeHeroData({
    ...heroDefaults,
    style: { tilt: "none" },
  } as HeroData);
  expect(normalized.style).toBeDefined();
  expect("tilt" in (normalized.style ?? {})).toBe(false);
});

test("hero resolveHeroTilt fail-soft: invalid tilt is omitted and never throws", () => {
  let normalized: HeroData | undefined;
  expect(() => {
    normalized = normalizeHeroData({
      ...heroDefaults,
      style: { tilt: "wild" as never },
    } as HeroData);
  }).not.toThrow();
  expect("tilt" in (normalized?.style ?? {})).toBe(false);
});

test("hero renders data-hero-tilt + max + motion-safe perspective when set", () => {
  const html = renderToString(
    <HeroBlock data={{ ...heroDefaults, style: { tilt: "subtle" } }} variant="centered" />
  );
  expect(html).toContain('data-hero-tilt="subtle"');
  expect(html).toContain('data-hero-tilt-max="5"');
  expect(html).toContain("motion-safe:[perspective:1000px]");
  expect(html).toContain("data-hero-tilt-inner");

  const strongHtml = renderToString(
    <HeroBlock data={{ ...heroDefaults, style: { tilt: "strong" } }} variant="centered" />
  );
  expect(strongHtml).toContain('data-hero-tilt-max="8"');
});

test("hero with no tilt is byte-identical (no attr, no script)", () => {
  const html = renderToString(<HeroBlock data={heroDefaults} variant="centered" />);
  expect(html).not.toContain("data-hero-tilt");
  expect(html).not.toContain("data-coderso-runtime-script");
});

test("hero tilt script emits once via registry with reduced-motion + pointer:fine guards, no interpolation", () => {
  const registry = createWidgetRuntimeScriptRegistry();
  const renderContext: WidgetRenderContext = { mode: "public", runtimeScripts: registry };

  const html = renderToString(
    <>
      <HeroBlock
        data={{ ...heroDefaults, style: { tilt: "subtle" } }}
        variant="centered"
        renderContext={renderContext}
      />
      <HeroBlock
        data={{ ...heroDefaults, style: { tilt: "strong" } }}
        variant="centered"
        renderContext={renderContext}
      />
    </>
  );
  // With a registry the emit is deduped/collected — no inline <script> in body.
  expect(html).not.toContain("data-coderso-runtime-script");

  const scriptsHtml = renderToString(<>{registry.renderScripts()}</>);
  const scriptTagCount = (scriptsHtml.match(/data-coderso-runtime-script="hero-tilt"/g) ?? [])
    .length;
  expect(scriptTagCount).toBe(1); // deduped across two heroes
  expect(scriptsHtml).toContain("(prefers-reduced-motion: reduce)");
  expect(scriptsHtml).toContain("(pointer:fine)");
  // Config is read from the DOM attribute, never interpolated into the source.
  expect(scriptsHtml).toContain('getAttribute("data-hero-tilt-max")');
});

test("hero tilt emits NO script on the builder-canvas shape (no runtime registry)", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, style: { tilt: "subtle" } }}
      variant="centered"
      renderContext={{ mode: "admin-preview" }}
    />
  );
  // Inert scaffolding still renders, but no script binds on the canvas.
  expect(html).toContain('data-hero-tilt="subtle"');
  expect(html).not.toContain("data-coderso-runtime-script");
  expect(html).not.toContain("pointermove");
});
