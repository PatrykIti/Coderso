// @vitest-environment happy-dom

// TASK-105-08-08-L03 regression suite: pins the supported rich-text toolbar
// behavior adjacent to the deleted profile-invariant fallbacks in
// PostRichTextToolbar (the single-action group promotion and the label-only
// action fallback were source-proven unreachable: every action carries an
// icon, and every command group is either multi-action or absent per
// profile).
//   1. Each profile renders exactly its own groups as dropdown menus whose
//      items are the selected profile's actual commands, in contract order.
//   2. Primary and advanced actions emit their commands; the advanced row
//      still toggles behind "More formatting" where the profile allows it.
//   3. Disabled toolbars present disabled controls and reject every command.

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => (
    <div data-dropdown-group="true">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-dropdown-content="true">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      data-dropdown-item="true"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect?.();
      }}
      {...props}
    >
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => (
    <div data-select="true">{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-select-item={value}>{children}</div>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: () => <span data-infotip="true" />,
}));

import {
  PostRichTextToolbar,
  type PostRichTextCommand,
  type PostRichTextToolbarProfile,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const mountToolbar = (
  props: Partial<{
    profile: PostRichTextToolbarProfile;
    disabled: boolean;
    onCommand: (command: PostRichTextCommand) => void;
    onFontFamilyChange: (value: "sans" | "serif" | "mono") => void;
    onBaseTextScaleChange: (value: "sm" | "md" | "lg" | "xl") => void;
  }> = {}
) => mount(<PostRichTextToolbar onCommand={() => undefined} {...props} />);

const buttonByLabel = (root: ParentNode, label: string) => {
  const button = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(button, `missing toolbar button: ${label}`).toBeTruthy();
  return button as HTMLButtonElement;
};

const groupTrigger = (root: ParentNode, label: string) =>
  root.querySelector<HTMLButtonElement>(`div[data-dropdown-group] > button[aria-label="${label}"]`);

const click = (element: Element) => {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const itemLabelsInGroup = (root: ParentNode, triggerLabel: string) => {
  const group = groupTrigger(root, triggerLabel)?.closest("div[data-dropdown-group]");
  expect(group, `missing dropdown group: ${triggerLabel}`).toBeTruthy();
  return Array.from((group as HTMLElement).querySelectorAll("button[data-dropdown-item]")).map(
    (item) => item.getAttribute("aria-label")
  );
};

// Labels like Paragraph/Quote exist in more than one group, so ambiguous
// item clicks are scoped to their owning dropdown.
const clickItemInGroup = (root: ParentNode, triggerLabel: string, itemLabel: string) => {
  const group = groupTrigger(root, triggerLabel)?.closest("div[data-dropdown-group]");
  expect(group, `missing dropdown group: ${triggerLabel}`).toBeTruthy();
  const item = (group as HTMLElement).querySelector(
    `button[data-dropdown-item][aria-label="${itemLabel}"]`
  );
  expect(item, `missing item ${itemLabel} in group ${triggerLabel}`).toBeTruthy();
  click(item as Element);
};

test("writing-canvas primary actions emit their commands in order", () => {
  const onCommand = vi.fn();
  const view = mountToolbar({ profile: "writing-canvas", onCommand });
  try {
    for (const label of ["Bold", "Italic", "Link"]) {
      click(buttonByLabel(view.container, label));
    }
    expect(onCommand.mock.calls.map(([command]) => command)).toEqual(["bold", "italic", "link"]);
  } finally {
    view.cleanup();
  }
});

test("writing-canvas command groups expose the profile's actual commands", () => {
  const onCommand = vi.fn();
  const view = mountToolbar({ profile: "writing-canvas", onCommand });
  try {
    // Type/Text/List/Code render as their dropdown menus; Headings is out of
    // scope for the writing-canvas profile and must not appear at all.
    expect(itemLabelsInGroup(view.container, "Type")).toEqual([
      "Section",
      "Paragraph",
      "Heading",
      "Quote",
    ]);
    expect(itemLabelsInGroup(view.container, "Text")).toEqual([
      "Paragraph",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Heading 5",
      "Heading 6",
      "Quote",
    ]);
    expect(itemLabelsInGroup(view.container, "List")).toEqual(["Bullet list", "Ordered list"]);
    expect(itemLabelsInGroup(view.container, "Code")).toEqual(["Inline code", "Code block"]);
    expect(groupTrigger(view.container, "Headings")).toBeNull();

    // Menu items commit their command through onCommand.
    clickItemInGroup(view.container, "Text", "Heading 2");
    clickItemInGroup(view.container, "Text", "Quote");
    clickItemInGroup(view.container, "List", "Bullet list");
    clickItemInGroup(view.container, "Code", "Code block");
    clickItemInGroup(view.container, "Type", "Section");
    expect(onCommand.mock.calls.map(([command]) => command)).toEqual([
      "heading-2",
      "quote",
      "bullet-list",
      "code-block",
      "type-section",
    ]);
  } finally {
    view.cleanup();
  }
});

test("writing-canvas advanced formatting toggles and emits every advanced command", () => {
  const onCommand = vi.fn();
  const view = mountToolbar({ profile: "writing-canvas", onCommand });
  try {
    const moreButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("More formatting")
    );
    expect(moreButton).toBeTruthy();
    expect(moreButton?.getAttribute("aria-expanded")).toBe("false");

    // Layout actions live behind the toggle, not in the primary row.
    expect(view.container.querySelector('button[aria-label="Align left"]')).toBeNull();

    click(moreButton as Element);
    const advancedRow = view.container.querySelector("#post-richtext-advanced-actions");
    expect(advancedRow).toBeTruthy();
    expect(moreButton?.getAttribute("aria-expanded")).toBe("true");

    for (const label of [
      "Underline",
      "Strike",
      "Highlight",
      "Align left",
      "Align center",
      "Align right",
      "Clear formatting",
    ]) {
      click(buttonByLabel(advancedRow as HTMLElement, label));
    }
    expect(onCommand.mock.calls.map(([command]) => command)).toEqual([
      "underline",
      "strike",
      "highlight",
      "align-left",
      "align-center",
      "align-right",
      "clear-formatting",
    ]);

    // The toggle collapses the advanced row again.
    click(moreButton as Element);
    expect(view.container.querySelector("#post-richtext-advanced-actions")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("heading profile renders Type and Headings groups with inline layout actions", () => {
  const onCommand = vi.fn();
  const view = mountToolbar({ profile: "heading", onCommand });
  try {
    expect(itemLabelsInGroup(view.container, "Type")).toEqual([
      "Section",
      "Paragraph",
      "Heading",
      "Quote",
    ]);
    expect(itemLabelsInGroup(view.container, "Headings")).toEqual([
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Heading 5",
      "Heading 6",
    ]);
    // Text/List/Code are out of profile scope: no group, no trigger.
    for (const absent of ["Text", "List", "Code"]) {
      expect(groupTrigger(view.container, absent)).toBeNull();
    }

    // Layout actions sit inline in the primary row for element profiles, so
    // the advanced toggle is unnecessary and absent.
    for (const label of ["Align left", "Align center", "Align right", "Clear formatting"]) {
      const button = buttonByLabel(view.container, label);
      expect(button.closest("#post-richtext-advanced-actions")).toBeNull();
      click(button);
    }
    expect(
      Array.from(view.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("More formatting")
      )
    ).toBeUndefined();

    click(buttonByLabel(view.container, "Heading 4"));
    expect(onCommand.mock.calls.map(([command]) => command)).toEqual([
      "align-left",
      "align-center",
      "align-right",
      "clear-formatting",
      "heading-4",
    ]);
  } finally {
    view.cleanup();
  }
});

test("paragraph, quote, and callout profiles keep Type plus inline layout and drop other groups", () => {
  for (const profile of ["paragraph", "quote", "callout"] as const) {
    const onCommand = vi.fn();
    const view = mountToolbar({ profile, onCommand });
    try {
      expect(itemLabelsInGroup(view.container, "Type")).toEqual([
        "Section",
        "Paragraph",
        "Heading",
        "Quote",
      ]);
      for (const absent of ["Text", "Headings", "List", "Code"]) {
        expect(groupTrigger(view.container, absent)).toBeNull();
      }

      click(buttonByLabel(view.container, "Bold"));
      click(buttonByLabel(view.container, "Align center"));
      clickItemInGroup(view.container, "Type", "Section");
      expect(onCommand.mock.calls.map(([command]) => command)).toEqual([
        "bold",
        "align-center",
        "type-section",
      ]);
    } finally {
      view.cleanup();
    }
  }
});

test("disabled toolbars present disabled controls and reject every command", () => {
  const onCommand = vi.fn();
  const view = mountToolbar({
    profile: "writing-canvas",
    disabled: true,
    onCommand,
    onFontFamilyChange: () => undefined,
  });
  try {
    // Primary actions, group triggers, and the advanced toggle all carry the
    // disabled state, so none of the toolbar's commands can be requested.
    const bold = buttonByLabel(view.container, "Bold");
    expect(bold.disabled).toBe(true);
    for (const trigger of ["Type", "Text", "List", "Code"]) {
      expect(groupTrigger(view.container, trigger)?.disabled).toBe(true);
    }
    const moreButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("More formatting")
    );
    expect(moreButton?.disabled).toBe(true);

    click(bold);
    expect(onCommand).not.toHaveBeenCalled();

    // The typography hint explains why the controls are unavailable.
    expect(view.container.textContent).toContain(
      "Typography unavailable for the current selection."
    );
  } finally {
    view.cleanup();
  }
});

test("typography row follows the provided change handlers", () => {
  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();
  const view = mountToolbar({
    profile: "writing-canvas",
    onFontFamilyChange,
    onBaseTextScaleChange,
  });
  try {
    expect(view.container.textContent).toContain("Typography follows the selected block style.");
    expect(view.container.querySelectorAll("[data-select]").length).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});
