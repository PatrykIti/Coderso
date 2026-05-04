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
  expect(getWidget("screen-record-header")).not.toBeNull();

  clearWidgets();

  expect(getWidget("content-list")).toBeNull();
  expect(getWidget("screen-record-header")).toBeNull();

  ensureRuntimeWidgetsRegistered();

  expect(getWidget("content-list")).not.toBeNull();
  expect(getWidget("screen-record-header")).not.toBeNull();
  expect(getWidget("screen-two-column")).not.toBeNull();
});

test("runtime registry exposes the concrete admin-editor-view screen widget contract", () => {
  ensureRuntimeWidgetsRegistered();

  expect(getWidget("screen-record-header")?.surfaces).toEqual([
    "custom-screen-builder",
    "admin-editor-view",
  ]);
  expect(getWidget("screen-record-header")?.dataAccess).toEqual({
    source: "selected-entry",
    modes: ["read", "write"],
  });
  expect(getWidget("screen-record-header")?.bindingTargets).toEqual([
    expect.objectContaining({ propPath: "eyebrow", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "title", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "subtitle", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "description", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "badge", modes: ["read", "write"] }),
  ]);
  expect(getWidget("screen-field-value")?.dataAccess).toEqual({
    source: "selected-entry",
    modes: ["read", "write"],
  });
  expect(getWidget("screen-field-value")?.bindingTargets).toEqual([
    expect.objectContaining({ propPath: "label", modes: ["read"] }),
    expect.objectContaining({ propPath: "value", modes: ["read", "write"] }),
    expect.objectContaining({ propPath: "helper", modes: ["read"] }),
  ]);
  expect(getWidget("screen-field-group")?.dataAccess).toEqual({
    source: "selected-content-type",
    modes: ["read"],
  });
  expect(getWidget("screen-two-column")?.dataAccess).toEqual({
    source: "selected-content-type",
    modes: ["read"],
  });

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
  ).toEqual([
    "screen-record-header",
    "screen-field-value",
    "screen-field-group",
    "screen-two-column",
  ]);
});
