// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { GalleryCategoryTokensControl } from "../../../core/admin/ui/pages/editorControls/GalleryCategoryTokensControl";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TokensHarness = ({
  initialValue = [],
  onChange = vi.fn(),
}: {
  initialValue?: readonly string[];
  onChange?: (value: string[]) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  const handleChange = (next: string[]) => {
    onChange(next);
    setValue(next);
  };
  return <GalleryCategoryTokensControl label="Categories" value={value} onChange={handleChange} />;
};

const mountHarness = (props: {
  initialValue?: readonly string[];
  onChange?: (value: string[]) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<TokensHarness {...props} />);
  });
  return {
    container,
    rerender: (next: {
      initialValue?: readonly string[];
      onChange?: (value: string[]) => void;
    }) => {
      React.act(() => {
        root.render(<TokensHarness {...next} />);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const click = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (field: HTMLInputElement, value: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const newTokenInput = (container: ParentNode) => {
  const field = container.querySelector('input[aria-label="New category token"]');
  expect(field).toBeTruthy();
  return field as HTMLInputElement;
};

const addButton = (container: ParentNode) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Add")
  ) ?? null;

const tokenChips = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-gallery-category-token]"));

const lastCommitted = (onChange: ReturnType<typeof vi.fn>): string[] =>
  onChange.mock.calls.at(-1)?.[0] as string[];

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("renders stored tokens in order with one-based accessible names; mount emits nothing", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: ["news", "promo"], onChange });
  try {
    const chips = tokenChips(view.container);
    expect(chips).toHaveLength(2);
    expect(chips[0]?.getAttribute("data-page-editor-gallery-category-token")).toBe("1");
    expect(chips[1]?.getAttribute("data-page-editor-gallery-category-token")).toBe("2");
    expect(chips[0]?.textContent).toContain("news");
    expect(chips[1]?.textContent).toContain("promo");
    expect(
      view.container.querySelector('button[aria-label="Remove category token 1"]')
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("add trims a valid token, commits it appended, and clears the draft input", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: ["news"], onChange });
  try {
    setInputValue(newTokenInput(view.container), "  promo  ");
    click(addButton(view.container));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastCommitted(onChange)).toEqual(["news", "promo"]);
    expect(newTokenInput(view.container).value).toBe("");
    expect(tokenChips(view.container)).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("48-char token commits; a 49-char token is rejected without emitting", () => {
  const token48 = "a".repeat(48);
  const token49 = "a".repeat(49);
  const onChange = vi.fn();
  const view = mountHarness({ onChange });
  try {
    setInputValue(newTokenInput(view.container), token48);
    click(addButton(view.container));
    expect(lastCommitted(onChange)).toEqual([token48]);
    const before = onChange.mock.calls.length;
    setInputValue(newTokenInput(view.container), token49);
    click(addButton(view.container));
    expect(onChange.mock.calls.length).toBe(before);
    expect(tokenChips(view.container)).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("a duplicate token is rejected without silently replacing the existing one", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: ["news"], onChange });
  try {
    setInputValue(newTokenInput(view.container), "news");
    click(addButton(view.container));
    expect(onChange).not.toHaveBeenCalled();
    const chips = tokenChips(view.container);
    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent).toContain("news");
  } finally {
    view.cleanup();
  }
});

test("an invalid token pattern is rejected without emitting", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: ["news"], onChange });
  try {
    setInputValue(newTokenInput(view.container), "bad token!");
    click(addButton(view.container));
    expect(onChange).not.toHaveBeenCalled();
    expect(tokenChips(view.container)).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("tokens are never sorted: stored order is preserved and new tokens append", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: ["zeta", "alpha"], onChange });
  try {
    setInputValue(newTokenInput(view.container), "mid");
    click(addButton(view.container));
    expect(lastCommitted(onChange)).toEqual(["zeta", "alpha", "mid"]);
    const chips = tokenChips(view.container);
    expect(chips[0]?.textContent).toContain("zeta");
    expect(chips[1]?.textContent).toContain("alpha");
    expect(chips[2]?.textContent).toContain("mid");
  } finally {
    view.cleanup();
  }
});

test("add is disabled at 12 tokens and a 13th token is never emitted", () => {
  const onChange = vi.fn();
  const twelve = Array.from({ length: 12 }, (_, index) => `t${index}`);
  const view = mountHarness({ initialValue: twelve, onChange });
  try {
    expect(newTokenInput(view.container).hasAttribute("disabled")).toBe(true);
    expect(addButton(view.container)?.hasAttribute("disabled")).toBe(true);
    setInputValue(newTokenInput(view.container), "t13");
    click(addButton(view.container));
    expect(onChange).not.toHaveBeenCalled();
    expect(tokenChips(view.container)).toHaveLength(12);
  } finally {
    view.cleanup();
  }
});

test("a 587-character space-joined category bound is respected (12 x 48 + 11 spaces)", () => {
  const token48 = (letter: string) => letter.repeat(48);
  const eleven = Array.from({ length: 11 }, (_, index) => token48(String.fromCharCode(97 + index)));
  const twelfth = token48("l");
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: eleven, onChange });
  try {
    setInputValue(newTokenInput(view.container), twelfth);
    click(addButton(view.container));
    const committed = lastCommitted(onChange);
    expect(committed).toHaveLength(12);
    expect(committed.join(" ").length).toBe(587);
    expect(addButton(view.container)?.hasAttribute("disabled")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("remove deletes only the chosen token and keeps focus on the input", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: ["news", "promo", "events"], onChange });
  try {
    click(view.container.querySelector('button[aria-label="Remove category token 2"]'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastCommitted(onChange)).toEqual(["news", "events"]);
    expect(tokenChips(view.container)).toHaveLength(2);
    expect(document.activeElement).toBe(newTokenInput(view.container));
  } finally {
    view.cleanup();
  }
});
