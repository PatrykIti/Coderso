import { expect, test } from "bun:test";
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

  const headerRowMatches =
    html.match(/flex w-full items-start justify-between gap-2/g) ?? [];
  expect(headerRowMatches.length).toBe(3);
});
