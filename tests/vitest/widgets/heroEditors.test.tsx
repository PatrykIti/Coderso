import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { HeroVisualEditor } from "../../../core/admin/ui/widgets/editors/HeroEditors";
import { heroDefaults } from "../../../core/widgets/core/hero";

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
  expect(html).toContain('data-link-destination-field="hero-badge-destination"');
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
  expect(html).toContain('data-widget-control="hero.socialProof.enabled"');
  expect(html).toContain("Hero palettes");
  expect(html).toContain("Contrast guidance");
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
});
