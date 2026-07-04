import { afterEach, expect, test } from "bun:test";

import {
  clearWidgets,
  getWidget,
  listWidgetsForSurfaceContext,
} from "../../../core/widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

afterEach(() => {
  clearWidgets();
});

test("ensureRuntimeWidgetsRegistered re-registers core widgets after registry was cleared", () => {
  ensureRuntimeWidgetsRegistered();
  expect(getWidget("content-list")).not.toBeNull();
  expect(getWidget("screen-record-header")).toBeNull();

  clearWidgets();

  expect(getWidget("content-list")).toBeNull();
  expect(getWidget("screen-record-header")).toBeNull();

  ensureRuntimeWidgetsRegistered();

  expect(getWidget("content-list")).not.toBeNull();
  expect(getWidget("screen-record-header")).toBeNull();
  expect(getWidget("screen-two-column")).toBeNull();
});

test("runtime registry retires legacy admin-editor-view screen widgets", () => {
  ensureRuntimeWidgetsRegistered();

  expect(getWidget("screen-record-header")).toBeNull();
  expect(getWidget("screen-field-value")).toBeNull();
  expect(getWidget("screen-field-group")).toBeNull();
  expect(getWidget("screen-two-column")).toBeNull();

  expect(
    listWidgetsForSurfaceContext({
      surface: "admin-editor-view",
      hasSelectedContentType: false,
    }).map((widget) => widget.type)
  ).toEqual([]);

  expect(
    listWidgetsForSurfaceContext({
      surface: "admin-editor-view",
      hasSelectedContentType: true,
    }).map((widget) => widget.type)
  ).toEqual([]);
});
