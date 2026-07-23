import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { GitHubBrandIcon } from "../../../_docs/_PROTOTYPE/src/components/BrandIcons";

test("prototype GitHub provider keeps a stable brand glyph with decorative semantics", () => {
  const html = renderToString(<GitHubBrandIcon className="size-4" aria-hidden="true" />);

  expect(html).toContain('data-brand-icon="github"');
  expect(html).toContain('class="lucide lucide-github size-4"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5');
});
