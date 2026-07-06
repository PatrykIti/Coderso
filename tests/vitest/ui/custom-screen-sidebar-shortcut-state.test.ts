import { expect, test } from "vitest";

import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import { resolveCustomScreenSidebarShortcutState } from "../../../core/admin/ui/custom-screens/customScreenListModel";

const makeScreen = (overrides: Partial<CustomScreenRecord> = {}): CustomScreenRecord => ({
  id: "screen-1",
  name: "Product workspace",
  contentTypeId: "ct-products",
  status: "draft",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: "Catalog",
  schemaVersion: 1,
  blocks: [],
  bindings: [],
  createdAt: "2026-03-05T00:00:00.000Z",
  updatedAt: "2026-03-05T00:00:00.000Z",
  ...overrides,
});

test("resolveCustomScreenSidebarShortcutState returns 'visible' for Active pinned read-only dashboard screen", () => {
  // Dashboard mode: has blocks + a read-only binding => no dedicated editor.
  // Before TASK-515 this yielded "requires_editor_setup"; now Active + pinned = visible.
  const screen = makeScreen({
    status: "active",
    showInSidebar: true,
    blocks: [{ id: "field-1", type: "screen-field-value", data: {} }],
    bindings: [
      {
        id: "binding-1",
        widgetId: "field-1",
        propPath: "value",
        field: "title",
        mode: "read",
      },
    ],
  });

  expect(resolveCustomScreenSidebarShortcutState(screen)).toBe("visible");
});

test("resolveCustomScreenSidebarShortcutState returns 'hidden' when not pinned", () => {
  const screen = makeScreen({ status: "active", showInSidebar: false });
  expect(resolveCustomScreenSidebarShortcutState(screen)).toBe("hidden");
});

test("resolveCustomScreenSidebarShortcutState returns 'configured_after_activation' for pinned draft", () => {
  const screen = makeScreen({ status: "draft", showInSidebar: true });
  expect(resolveCustomScreenSidebarShortcutState(screen)).toBe("configured_after_activation");
});
