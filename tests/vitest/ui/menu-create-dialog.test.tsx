// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import {
  MenuCreateDialog,
  type MenuCreateDialogProps,
} from "../../../core/admin/ui/menus/MenuCreateDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountDialog = (overrides: Partial<MenuCreateDialogProps> = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const props: MenuCreateDialogProps = {
    open: overrides.open ?? true,
    onOpenChange: overrides.onOpenChange ?? vi.fn(),
    onCreate: overrides.onCreate ?? vi.fn(),
    ...(overrides.onCreateError === undefined ? {} : { onCreateError: overrides.onCreateError }),
  };

  React.act(() => {
    root.render(<MenuCreateDialog {...props} />);
  });

  return {
    props,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const buttonByText = (text: string) => {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  expect(button, `button "${text}"`).toBeTruthy();
  if (!button) throw new Error(`Expected a button labelled ${text}.`);
  return button;
};

const inputByPlaceholder = (placeholder: string) => {
  const input = document.body.querySelector(`input[placeholder="${placeholder}"]`);
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Expected an input with placeholder ${placeholder}.`);
  }
  return input;
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const click = (button: HTMLButtonElement) => {
  React.act(() => {
    button.click();
  });
};

const clickAsync = async (button: HTMLButtonElement) => {
  await React.act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("the create dialog validates a blank name and clears its error through Radix", () => {
  const view = mountDialog();

  try {
    click(buttonByText("Create Menu"));

    expect(document.body.textContent).toContain("Menu name is required.");
    expect(view.props.onCreate).not.toHaveBeenCalled();

    const radixClose = document.body.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');
    expect(radixClose).not.toBeNull();
    if (!radixClose) throw new Error("Expected the Radix dialog close control.");
    click(radixClose);

    expect(view.props.onOpenChange).toHaveBeenCalledWith(false);
    expect(document.body.textContent).not.toContain("Menu name is required.");
  } finally {
    view.cleanup();
  }
});

test("the create dialog forwards its header and cancel close controls", () => {
  const view = mountDialog();

  try {
    const headerClose = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Close create menu dialog"]'
    );
    expect(headerClose).not.toBeNull();
    if (!headerClose) throw new Error("Expected the create-dialog header close control.");

    click(headerClose);
    click(buttonByText("Cancel"));

    expect(view.props.onOpenChange).toHaveBeenNthCalledWith(1, false);
    expect(view.props.onOpenChange).toHaveBeenNthCalledWith(2, false);
  } finally {
    view.cleanup();
  }
});

test("the create dialog submits trimmed values, disables actions while pending, and resets", async () => {
  let resolveCreate: (() => void) | undefined;
  const onCreate = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveCreate = resolve;
      })
  );
  const view = mountDialog({ onCreate });

  try {
    const name = inputByPlaceholder("Main Menu");
    const location = inputByPlaceholder("primary");
    setInputValue(name, "  Primary navigation  ");
    setInputValue(location, "   ");

    click(buttonByText("Create Menu"));

    expect(onCreate).toHaveBeenCalledWith({
      name: "Primary navigation",
      location: undefined,
    });
    expect(buttonByText("Creating...").disabled).toBe(true);
    expect(buttonByText("Cancel").disabled).toBe(true);

    const completeCreate = resolveCreate;
    if (!completeCreate) throw new Error("Expected create action to be pending.");
    await React.act(async () => {
      completeCreate();
      await Promise.resolve();
    });

    expect(name.value).toBe("");
    expect(location.value).toBe("");
    expect(view.props.onOpenChange).toHaveBeenCalledWith(false);
    expect(buttonByText("Create Menu").disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("the create dialog exposes an Error message and reports it to the callback", async () => {
  const error = new Error("A menu with this name already exists.");
  const onCreateError = vi.fn();
  const view = mountDialog({
    onCreate: vi.fn().mockRejectedValue(error),
    onCreateError,
  });

  try {
    setInputValue(inputByPlaceholder("Main Menu"), "Primary navigation");
    await clickAsync(buttonByText("Create Menu"));

    expect(document.body.textContent).toContain(error.message);
    expect(onCreateError).toHaveBeenCalledWith(error);
    expect(buttonByText("Create Menu").disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("the create dialog falls back from an opaque rejection without an error callback", async () => {
  const onCreate = vi.fn().mockRejectedValue({});
  const view = mountDialog({ onCreate });

  try {
    setInputValue(inputByPlaceholder("Main Menu"), "Fallback menu");
    await clickAsync(buttonByText("Create Menu"));

    expect(onCreate).toHaveBeenCalledWith({ name: "Fallback menu", location: undefined });
    expect(document.body.textContent).toContain("Failed to create menu.");
    expect(buttonByText("Create Menu").disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});
