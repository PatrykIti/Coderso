import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";

test("EntryEditor renders main panels", () => {
  const html = renderAdminUi(<EntryEditor />);

  expect(html).toContain("Loading entry fields");
  expect(html).toContain("Search Engine Optimization");
  expect(html).toContain("Taxonomy");
  expect(html).toContain("Runtime preview");
});

test("EntryEditor lets the metadata panel own right-panel scrolling", () => {
  const html = renderAdminUi(<EntryEditor />);

  expect(html).toMatch(
    /<aside[^>]*class="[^"]*min-h-0[^"]*overflow-hidden[^"]*"[^>]*><div data-entry-metadata-panel="true"/
  );
  expect(html).toContain(
    'data-entry-metadata-panel="true" class="flex h-full min-h-0 flex-col overflow-hidden"'
  );
  expect(html).toContain(
    'data-slot="scroll-area" class="relative min-h-0 flex-1 px-6 py-6"'
  );
  expect(html).toContain('class="shrink-0 border-t px-6 py-4"');
});
