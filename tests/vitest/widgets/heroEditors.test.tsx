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
  expect(cardMatches.length).toBe(3);

  const headerRowMatches = html.match(/flex w-full items-start justify-between gap-2/g) ?? [];
  expect(headerRowMatches.length).toBe(3);
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
  expect(html).toContain("Use a relative path, hash, or full URL.");
});
