// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { EntryMetadataPanel } from "../../../core/admin/ui/entries/EntryMetadataPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-scroll-area="true">{children}</div>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (React.isValidElement(child)) {
          return flattenText(child.props.children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: () => <span data-info-tip="true" />,
}));

vi.mock("@/ui/shared/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-status-badge={status} />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const baseProps = {
  status: "draft" as const,
  onStatusChange: () => {},
  scheduledAt: "",
  onScheduledAtChange: () => {},
  title: "Hello world",
  slug: "hello-world",
  seoDescription: "",
  onSeoDescriptionChange: () => {},
};

const findSelectByOption = (container: HTMLElement, optionValue: string) =>
  Array.from(container.querySelectorAll("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === optionValue)
  ) ?? null;

test("visibility select toggles the password input", () => {
  const { container, cleanup } = mount(<EntryMetadataPanel {...baseProps} visibility="public" />);

  // Public → no password input.
  expect(container.querySelector('input[type="password"]')).toBeNull();

  cleanup();

  const { container: pwContainer, cleanup: cleanup2 } = mount(
    <EntryMetadataPanel {...baseProps} visibility="password" hasPassword={false} />
  );
  expect(pwContainer.querySelector('input[type="password"]')).not.toBeNull();
  expect(pwContainer.textContent).toContain("Required to protect this entry.");
  cleanup2();
});

test("onVisibilityChange and onAccessPasswordChange fire on interaction", () => {
  const onVisibilityChange = vi.fn();
  const onAccessPasswordChange = vi.fn();
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      visibility="password"
      hasPassword
      onVisibilityChange={onVisibilityChange}
      onAccessPasswordChange={onAccessPasswordChange}
    />
  );

  const visibilitySelect = findSelectByOption(container, "password");
  React.act(() => {
    setSelectValue(visibilitySelect, "private");
  });
  expect(onVisibilityChange).toHaveBeenCalledWith("private");

  const passwordInput = container.querySelector('input[type="password"]');
  React.act(() => {
    setInputValue(passwordInput, "s3cret");
  });
  expect(onAccessPasswordChange).toHaveBeenCalledWith("s3cret");

  // hasPassword helper copy points to the Visibility-switch remove path.
  expect(container.textContent).toContain("switch Visibility to Public/Private to remove it");
  cleanup();
});

test("no Clear password control in either hasPassword state", () => {
  for (const hasPassword of [true, false]) {
    const { container, cleanup } = mount(
      <EntryMetadataPanel {...baseProps} visibility="password" hasPassword={hasPassword} />
    );
    const hasClearButton = Array.from(container.querySelectorAll("button")).some((button) =>
      /clear password/i.test(button.textContent ?? "")
    );
    expect(hasClearButton).toBe(false);
    cleanup();
  }
});

test("Metadata card renders values and author appears exactly once (no avatar footer)", () => {
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      author={{ name: "Maria Nowak", email: "maria@example.com" }}
      createdAt="2026-06-18T10:00:00.000Z"
      updatedAt="2026-06-27T10:00:00.000Z"
      entryId="ent_8f21a0"
    />
  );

  expect(container.textContent).toContain("Metadata");
  expect(container.textContent).toContain("ent_8f21a0");
  expect(container.textContent).toContain("Jun 18, 2026");

  // Author renders exactly once (Metadata card only — no legacy avatar footer).
  const authorCount = (container.textContent?.match(/Maria Nowak/g) ?? []).length;
  expect(authorCount).toBe(1);
  // The removed footer rendered the author email in an uppercase footer line.
  const emailCount = (container.textContent?.match(/maria@example\.com/g) ?? []).length;
  expect(emailCount).toBe(0);
  cleanup();
});

test("scrollable gates the ScrollArea wrapper", () => {
  const scrollingMount = mount(<EntryMetadataPanel {...baseProps} scrollable />);
  expect(scrollingMount.container.querySelector('[data-scroll-area="true"]')).not.toBeNull();
  scrollingMount.cleanup();

  const plainMount = mount(<EntryMetadataPanel {...baseProps} scrollable={false} />);
  expect(plainMount.container.querySelector('[data-scroll-area="true"]')).toBeNull();
  plainMount.cleanup();
});

test("chrome uses SectionCard headers with prototype titles and StatusBadge action", () => {
  const { container, cleanup } = mount(<EntryMetadataPanel {...baseProps} status="published" />);

  expect(container.textContent).toContain("Publish");
  expect(container.textContent).not.toContain("Publishing");
  expect(container.textContent).toContain("Taxonomy");
  expect(container.textContent).toContain("Metadata");
  // StatusBadge lives in the Publish header (action slot).
  expect(container.querySelector('[data-status-badge="published"]')).not.toBeNull();
  cleanup();
});

test("regression: checklist, SEO description, tag add, save metadata remain wired", () => {
  const onSave = vi.fn();
  const onSeoDescriptionChange = vi.fn();
  const onTagIdsChange = vi.fn();
  const onCreateTag = vi.fn();
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      onSeoDescriptionChange={onSeoDescriptionChange}
      onSave={onSave}
      checklist={{
        items: [{ id: "c1", label: "Add a title", status: "complete" }],
        missingRequiredFields: [],
        blockingIssues: [],
      }}
      taxonomy={{
        categoryEnabled: false,
        tagEnabled: true,
        selectedCategoryId: null,
        selectedTagIds: [],
        categories: [],
        tags: [{ id: "t1", name: "News", slug: "news" }],
      }}
      onTagIdsChange={onTagIdsChange}
      onCreateTag={onCreateTag}
    />
  );

  // Checklist badge text present.
  expect(container.textContent).toContain("1/1 ready");
  expect(container.textContent).toContain("Add a title");

  // SEO description textarea wired.
  const textarea = container.querySelector("textarea");
  React.act(() => {
    if (textarea instanceof HTMLTextAreaElement) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "A summary");
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  expect(onSeoDescriptionChange).toHaveBeenCalledWith("A summary");

  // Tag add-on-Enter wired.
  const tagInput = Array.from(container.querySelectorAll("input")).find(
    (input) => input.getAttribute("placeholder") === "Add tag..."
  );
  React.act(() => {
    setInputValue(tagInput, "News");
  });
  React.act(() => {
    tagInput?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
  });
  expect(onTagIdsChange).toHaveBeenCalledWith(["t1"]);

  // Save metadata button wired.
  const saveButton = Array.from(container.querySelectorAll("button")).find((button) =>
    /save metadata/i.test(button.textContent ?? "")
  );
  React.act(() => {
    saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onSave).toHaveBeenCalled();
  cleanup();
});
