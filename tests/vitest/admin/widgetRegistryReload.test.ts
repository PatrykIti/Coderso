import { expect, test } from "vitest";

import {
  ensureCoreWidgetsRegistered,
  getRegisteredWidget,
  reloadWidgetEditorLoader,
} from "../../../core/admin/ui/widgets/registry";
import type { WidgetEditorComponent } from "../../../core/widgets/types";

/**
 * TASK-467-03-L03: `reloadWidgetEditorLoader` rebuilds a lazy editor from its
 * recorded factory so a failed dynamic import can be retried with a fresh
 * fetch. It must never return the same lazy identity for an indexed loader and
 * must pass eager (non-indexed) components through unchanged.
 */
test("reloadWidgetEditorLoader regenerates a fresh lazy component for core editors", () => {
  ensureCoreWidgetsRegistered();
  const hero = getRegisteredWidget("hero");
  expect(hero).not.toBeNull();
  expect(hero).toBeTruthy();

  const original = hero?.editor.visual as WidgetEditorComponent<Record<string, unknown>>;
  const reloaded = reloadWidgetEditorLoader(original);

  expect(reloaded).not.toBe(original);
  expect(reloaded).toBeTruthy();
  // Both are lazy components (React element type wrappers), not bare functions.
  expect((original as { $$typeof?: symbol }).$$typeof).toBeTruthy();
  expect((reloaded as { $$typeof?: symbol }).$$typeof).toBeTruthy();
});

test("reloadWidgetEditorLoader returns eager editors unchanged", () => {
  const eager = (() => null) as unknown as WidgetEditorComponent<Record<string, unknown>>;
  expect(reloadWidgetEditorLoader(eager)).toBe(eager);
});
