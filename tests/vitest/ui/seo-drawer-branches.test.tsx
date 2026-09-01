// @vitest-environment happy-dom

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";

import type { SeoItem } from "../../../core/admin/ui/seo/SeoTable";
import { SeoDrawer } from "../../../core/admin/ui/seo/SeoDrawer";
import { clickByText, flush, mount } from "./seoWaveFixtures";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

const item = (overrides: Partial<SeoItem> = {}): SeoItem => ({
  id: "doc-1",
  title: "Hello world",
  path: "/hello-world",
  score: 92,
  lastAuditAt: "2026-03-15T08:00:00.000Z",
  metaStatus: "optimized",
  socialStatus: "missing",
  metaTitle: "Hello world title",
  metaDescription: "A description",
  canonicalUrl: "",
  robots: "",
  keywords: ["seo"],
  previewUrl: "https://admin.test",
  previewPath: "hello-world",
  analysisStatus: "passed",
  analysisNotes: ["No issues found in the last audit."],
  ...overrides,
});

beforeEach(() => {
  document.body.innerHTML = "";
});

test("renders fields and search preview; save forwards edited payload", async () => {
  const onSave = vi.fn();
  const view = mount(<SeoDrawer item={item()} open onOpenChange={() => {}} onSave={onSave} />);
  try {
    expect(view.container.textContent).toContain("Hello world");
    expect(view.container.textContent).toContain("https://admin.test › hello-world");
    expect(view.container.textContent).toContain("Analysis Passed");
    expect(view.container.textContent).toContain("Focus Keywords");
    expect(view.container.textContent).toContain("17 / 60 characters");

    setInput(view.container, "Add a concise, keyword-rich title", "New SEO title");
    setInput(view.container, "https://example.com/page", "https://example.com/canonical");
    setInput(view.container, "index,follow", "noindex,nofollow");

    clickByText(view.container, "Update SEO");
    await flush();
    expect(onSave).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({
        title: "New SEO title",
        canonicalUrl: "https://example.com/canonical",
        robots: "noindex,nofollow",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("discard restores original values and disables until changed", async () => {
  const onSave = vi.fn();
  const view = mount(<SeoDrawer item={item()} open onOpenChange={() => {}} onSave={onSave} />);
  try {
    const discard = findButton(view.container, "Discard");
    expect(discard.disabled).toBe(true);

    setInput(view.container, "Add a concise, keyword-rich title", "Changed");
    expect(findButton(view.container, "Discard").disabled).toBe(false);
    clickByText(view.container, "Discard");
    const titleInput = Array.from(view.container.querySelectorAll("input")).find(
      (candidate) => candidate.placeholder === "Add a concise, keyword-rich title"
    );
    expect((titleInput as HTMLInputElement).value).toBe("Hello world title");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("attention analysis tone, long counters, saving label, error text, null item", async () => {
  const attention = item({
    analysisStatus: "attention",
    analysisNotes: ["Description too short", "No canonical URL"],
    metaDescription: "x".repeat(200),
  });
  const onSave = vi.fn(async () => {});
  const view = mount(
    <SeoDrawer
      item={attention}
      open
      onOpenChange={() => {}}
      onSave={async () => {}}
      isSaving={true}
      error="save:boom"
    />
  );
  try {
    expect(view.container.textContent).toContain("Needs Attention");
    expect(view.container.textContent).toContain("Description too short");
    expect(view.container.textContent).toContain("200 / 160 characters");
    expect(findButton(view.container, "Saving...").disabled).toBe(true);
    expect(view.container.textContent).toContain("save:boom");
    // Saving disables the confirm button so the payload cannot double-submit.
    clickByTextSafe(view.container, "Update SEO");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }

  const empty = mount(<SeoDrawer item={null} open onOpenChange={() => {}} onSave={onSave} />);
  try {
    expect(empty.container.textContent).toContain("No page selected");
  } finally {
    empty.cleanup();
  }
});

test("meta description edits flow through the textarea into the save payload", async () => {
  const onSave = vi.fn();
  const view = mount(<SeoDrawer item={item()} open onOpenChange={() => {}} onSave={onSave} />);
  try {
    setInput(
      view.container,
      "Summarize the page in one or two sentences.",
      "A concise meta description"
    );
    clickByText(view.container, "Update SEO");
    await flush();
    expect(onSave).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ description: "A concise meta description" })
    );
  } finally {
    view.cleanup();
  }
});

function setInput(container: HTMLElement, placeholder: string, value: string) {
  const element = Array.from(container.querySelectorAll("input, textarea")).find(
    (candidate) => (candidate as HTMLInputElement).placeholder === placeholder
  );
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing field: ${placeholder}`);
  }
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  React.act(() => {
    nativeSetter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function findButton(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  return button;
}

function clickByTextSafe(container: HTMLElement, text: string) {
  const button = container.querySelectorAll("button");
  for (const candidate of Array.from(button)) {
    if (candidate.textContent?.includes(text)) {
      React.act(() => {
        candidate.click();
      });
      return;
    }
  }
}
