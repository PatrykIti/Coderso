import { expect, test } from "vitest";

import {
  buildActiveWidgetPreviewStates,
  widgetSupportsPreviewState,
} from "../../../core/admin/ui/widgets/previewStateSupport";

test("widgetSupportsPreviewState follows the widget-owned capability", () => {
  expect(
    widgetSupportsPreviewState({
      editorCapabilities: { supportsPreviewState: true },
    } as never)
  ).toBe(true);
  expect(widgetSupportsPreviewState({ editorCapabilities: {} } as never)).toBe(false);
  expect(widgetSupportsPreviewState(undefined)).toBe(false);
});

test("buildActiveWidgetPreviewStates returns only the selected preview-capable block", () => {
  expect(
    buildActiveWidgetPreviewStates(
      "gallery-1",
      { editorCapabilities: { supportsPreviewState: true } } as never,
      {
        "gallery-1": {
          status: "ready",
          dataPatch: {
            resolved: {
              items: [],
              total: 0,
              resolvedAt: "2026-05-19T12:00:00.000Z",
            },
          },
        },
      }
    )
  ).toEqual({
    "gallery-1": {
      status: "ready",
      dataPatch: {
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-05-19T12:00:00.000Z",
        },
      },
    },
  });

  expect(
    buildActiveWidgetPreviewStates("gallery-1", { editorCapabilities: {} } as never, {
      "gallery-1": { status: "ready" },
    })
  ).toEqual({});
});
