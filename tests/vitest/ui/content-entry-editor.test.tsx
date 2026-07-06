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

test("EntryEditor mounts the metadata panel in a non-scrolling desktop column", () => {
  // TASK-514-03: prototype fidelity — the right column is an in-grid 320px track
  // of stacked SectionCards flowing with the page (no fixed-width <aside>, no
  // inner ScrollArea). The desktop mount passes scrollable={false}.
  const html = renderAdminUi(<EntryEditor />);

  // The 320px column lives inside the prototype grid, not a legacy fixed aside.
  expect(html).toContain("lg:grid-cols-[1fr_320px]");
  // The panel renders (data attribute from EntryMetadataPanel) ...
  expect(html).toContain('data-entry-metadata-panel="true"');
  // ... and, with scrollable={false}, its cards render directly (no ScrollArea
  // wrapper) — the panel body div follows the panel root immediately.
  expect(html).toContain(
    'data-entry-metadata-panel="true" class="flex h-full min-h-0 flex-col overflow-hidden"><div class="space-y-6 px-6 py-6"'
  );
});
