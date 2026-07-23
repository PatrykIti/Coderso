import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { HeroVisualEditor } from "../../../core/admin/ui/widgets/editors/HeroEditors";
import { heroDefaults, heroEditorContract, type HeroData } from "../../../core/widgets/core/hero";

test("hero appearance editor exposes style.tilt as a writable path", () => {
  const appearance = heroEditorContract.sections.find(
    (section) => section.id === "hero.appearance"
  );
  expect(appearance?.writablePaths).toContain("style.tilt");
  expect(appearance?.writablePaths).toContain("style.motion");
});

test("hero visual variant cards use full-width layout", () => {
  const html = renderToString(
    <HeroVisualEditor
      value={heroDefaults}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  const cardMatches = html.match(/w-full rounded-lg border p-3 text-left transition/g) ?? [];
  expect(cardMatches.length).toBe(4);

  const headerRowMatches = html.match(/flex w-full items-start justify-between gap-2/g) ?? [];
  expect(headerRowMatches.length).toBe(4);
});

test("hero visual editor exposes badge controls through shared section metadata", () => {
  const html = renderToString(
    <HeroVisualEditor
      value={{
        ...heroDefaults,
        badge: {
          enabled: true,
          label: "Launch week",
          href: "javascript:alert(1)",
          prefix: "New",
          tone: "primary",
          placement: "inline-headline",
        },
      }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Badge and headline");
  expect(html).toContain('data-widget-editor-section="hero.badge-headline"');
  expect(html).toContain('data-widget-control="hero.badge.enabled"');
  expect(html).toContain('data-widget-control="hero.badge.href"');
  expect(html).toContain('data-link-destination-field="hero.badge.href"');
  expect(html).toContain("A custom destination is already configured");
  expect(html).not.toContain("Use a relative path, hash, or full URL.");
});

test("hero visual editor hides inline media frame controls for centered and keeps them for inline media variants", () => {
  const centeredHtml = renderToString(
    <HeroVisualEditor
      value={heroDefaults}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );
  const splitHtml = renderToString(
    <HeroVisualEditor
      value={heroDefaults}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );
  const mediaCenterHtml = renderToString(
    <HeroVisualEditor
      value={heroDefaults}
      onChange={() => undefined}
      variant="media-center"
      onVariantChange={() => undefined}
    />
  );

  expect(centeredHtml).not.toContain("Media frame border color");
  expect(centeredHtml).not.toContain("Media border width");
  expect(centeredHtml).not.toContain("Media radius");
  expect(splitHtml).toContain("Media frame border color");
  expect(splitHtml).toContain("Media border width");
  expect(splitHtml).toContain("Media radius");
  expect(mediaCenterHtml).toContain("Media frame border color");
  expect(mediaCenterHtml).toContain("Media border width");
  expect(mediaCenterHtml).toContain("Media radius");
});

test("hero visual editor exposes rich copy, social proof, palette, and contrast controls", () => {
  const html = renderToString(
    <HeroVisualEditor
      value={{
        ...heroDefaults,
        socialProof: {
          enabled: true,
          rating: "4.9/5",
          reviewCount: "2,000+ reviews",
          label: "Trusted by teams.",
          avatars: [{ src: "/avatar-1.jpg", alt: "Reviewer avatar" }],
        },
      }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Rich copy and social proof");
  expect(html).toContain('data-widget-control="hero.richHeadline"');
  expect(html).toContain('data-widget-control="hero.richBody"');
  expect(html).toContain("Styled headline");
  expect(html).toContain("Styled body copy");
  expect(html).toContain('data-widget-control="hero.socialProof.enabled"');
  expect(html).toContain('data-widget-control="hero.socialProof.avatars.0.assetId"');
  expect(html).toContain("Hero palettes");
  expect(html).toContain("Contrast guidance");
  expect(html).not.toContain("Rich headline HTML");
  expect(html).not.toContain("Rich body HTML");
  expect(html).not.toContain("Allowed tags");
  expect(html).not.toContain("Avatar 1 URL");
  expect(html).not.toContain("https://cdn.example.com/avatar-1.jpg");
});

test("hero visual editor keeps custom color values behind swatch-only controls", () => {
  const value: HeroData = {
    ...heroDefaults,
    style: {
      ...heroDefaults.style,
      textColor: "var(--color-text)",
      subheadColor: "rgba(17, 24, 39, 0.8)",
      bodyColor: "not-a-color",
      primaryButtonBorder: "transparent",
    },
    background: {
      ...heroDefaults.background,
      color: "transparent",
    },
  };
  const html = renderToString(
    <HeroVisualEditor
      value={value}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Saved custom color");
  expect(html).toContain("Transparent");
  expect(html).toContain("Use transparent");
  expect(html).toContain('data-widget-control="hero.style.textColor"');
  expect(html).toContain('input type="color"');
  expect(html).not.toContain('placeholder="var(--color-text)"');
  expect(html).not.toContain('placeholder="rgba(17, 24, 39, 0.8)"');
  expect(html).not.toContain('placeholder="transparent"');
  expect(html).not.toContain('value="var(--color-text)"');
  expect(html).not.toContain('value="rgba(17, 24, 39, 0.8)"');
});

test("hero direct color controls mount currentColor and inherit without mutation", () => {
  let writes = 0;
  const html = renderToString(
    <HeroVisualEditor
      value={{
        ...heroDefaults,
        style: { ...heroDefaults.style, textColor: "currentColor", subheadColor: "inherit" },
      }}
      onChange={() => {
        writes += 1;
      }}
      variant="split"
      onVariantChange={() => undefined}
    />
  );
  expect(html.match(/data-shared-color-state="inherited"/g)).toHaveLength(2);
  expect(html).toContain("Inherited color");
  expect(writes).toBe(0);
});

test("hero visual editor switches image alt controls to video metadata", () => {
  const imageHtml = renderToString(
    <HeroVisualEditor
      value={{
        ...heroDefaults,
        media: { type: "image", src: "/hero.jpg", alt: "Hero alt" },
      }}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );
  const videoHtml = renderToString(
    <HeroVisualEditor
      value={{
        ...heroDefaults,
        media: {
          type: "video",
          src: "https://example.com/demo.mp4",
          posterSrc: "/poster.jpg",
          title: "Demo video",
          description: "Walkthrough",
        },
      }}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(imageHtml).toContain("Media alt text");
  expect(videoHtml).not.toContain("Media alt text");
  expect(videoHtml).toContain("Video title");
  expect(videoHtml).toContain("Video description");
  expect(videoHtml).toContain("Video poster image");
  expect(videoHtml).not.toContain("Media URL");
  expect(videoHtml).not.toContain("Poster image URL");
  expect(videoHtml).not.toContain("External URL");
});
