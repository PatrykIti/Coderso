import { afterEach, expect, test } from "vitest";

import { ensureCoreWidgetsRegistered } from "../../../core/admin/ui/widgets/registry";
import { clearWidgets } from "../../../core/widgets/registry";
import { getRegisteredWidget } from "../../../core/admin/ui/widgets/registry";

afterEach(() => {
  clearWidgets();
});

test("admin widget registry does not expose retired screen widgets", () => {
  ensureCoreWidgetsRegistered();

  expect(getRegisteredWidget("screen-record-header")).toBeNull();
  expect(getRegisteredWidget("screen-field-value")).toBeNull();
  expect(getRegisteredWidget("screen-field-group")).toBeNull();
  expect(getRegisteredWidget("screen-two-column")).toBeNull();
});
