import { afterEach, expect, test } from "bun:test";

import { clearWidgets, getWidget } from "../../../core/widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

afterEach(() => {
  clearWidgets();
});

test("ensureRuntimeWidgetsRegistered re-registers core widgets after registry was cleared", () => {
  ensureRuntimeWidgetsRegistered();
  expect(getWidget("content-list")).not.toBeNull();
  expect(getWidget("screen-record-header")).not.toBeNull();

  clearWidgets();

  expect(getWidget("content-list")).toBeNull();
  expect(getWidget("screen-record-header")).toBeNull();

  ensureRuntimeWidgetsRegistered();

  expect(getWidget("content-list")).not.toBeNull();
  expect(getWidget("screen-record-header")).not.toBeNull();
  expect(getWidget("screen-two-column")).not.toBeNull();
});
