import { afterEach, expect, test } from "vitest";

import { ensureCoreWidgetsRegistered } from "../../../core/admin/ui/widgets/registry";
import { clearWidgets } from "../../../core/widgets/registry";
import { getRegisteredWidget } from "../../../core/admin/ui/widgets/registry";

afterEach(() => {
  clearWidgets();
});

test("admin widget registry exposes widget-owned binding targets for screen widgets", () => {
  ensureCoreWidgetsRegistered();

  expect(getRegisteredWidget("screen-record-header")?.bindingTargets).toEqual([
    expect.objectContaining({ propPath: "eyebrow", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "title", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "subtitle", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "description", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "badge", modes: ["read", "write"] }),
  ]);
  expect(getRegisteredWidget("screen-field-value")?.bindingTargets).toEqual([
    expect.objectContaining({ propPath: "label", modes: ["read"] }),
    expect.objectContaining({ propPath: "value", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "helper", modes: ["read"] }),
  ]);
  expect(getRegisteredWidget("screen-field-group")?.bindingTargets).toEqual([]);
  expect(getRegisteredWidget("screen-two-column")?.bindingTargets).toEqual([]);
});
