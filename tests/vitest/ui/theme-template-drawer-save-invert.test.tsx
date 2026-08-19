// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import {
  clickButtonByText,
  findColorTextInputByLabel,
  findInputByPlaceholder,
  mount,
  setInputValue,
} from "./themeTemplateDrawerFixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
});

test("ThemeTemplateDrawer save is a no-op when onSave is omitted", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onOpenChange = vi.fn();
  const view = mount(<ThemeTemplateDrawer open onOpenChange={onOpenChange} />);

  try {
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Admin Pro"), "No Save Handler");
      setInputValue(findInputByPlaceholder(view.container, "Short summary"), "Still interactive");
    });

    expect(() => {
      clickButtonByText(view.container, "Create Template");
    }).not.toThrow();
    expect(onOpenChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ThemeTemplateDrawer inverts shorthand hex values in base colors", async () => {
  const { ThemeTemplateDrawer } = await import("../../../core/admin/ui/themes/ThemeTemplateDrawer");

  const onSave = vi.fn(async () => undefined);
  const view = mount(<ThemeTemplateDrawer open onOpenChange={() => undefined} onSave={onSave} />);

  try {
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Admin Pro"), "Shorthand");
      setInputValue(findColorTextInputByLabel(view.container, "Background"), "#abc");
    });

    clickButtonByText(view.container, "Invert section");
    clickButtonByText(view.container, "Create Template");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.objectContaining({
          base: expect.objectContaining({
            bg: "#554433",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});
