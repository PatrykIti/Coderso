// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContentTypeSidebar } from "../../../core/admin/ui/content-types/ContentTypeSidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(props: {
  items?: { id: string; name: string; count?: number }[];
  activeId?: string | null;
}) {
  const onSelect = vi.fn();
  const onCreate = vi.fn();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <ContentTypeSidebar
        items={props.items}
        activeId={props.activeId}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    );
  });
  return { onSelect, onCreate };
}

describe("ContentTypeSidebar", () => {
  test("renders fallback collections and single types when no items are passed", () => {
    mount({});
    expect(container!.textContent).toContain("Collections");
    expect(container!.textContent).toContain("Blog Post");
    expect(container!.textContent).toContain("Category");
    expect(container!.textContent).toContain("Author");
    expect(container!.textContent).toContain("12");
    expect(container!.textContent).toContain("Single Types");
    expect(container!.textContent).toContain("Homepage");
    expect(container!.textContent).toContain("Create New Type");
  });

  test("renders provided items and hides the single types section", () => {
    mount({
      items: [
        { id: "news", name: "News", count: 3 },
        { id: "page", name: "Page" },
      ],
    });
    expect(container!.textContent).toContain("News");
    expect(container!.textContent).toContain("Page");
    expect(container!.textContent).toContain("3");
    expect(container!.textContent).not.toContain("Single Types");
    expect(container!.textContent).not.toContain("Blog Post");
  });

  test("highlights the active collection", () => {
    mount({
      items: [
        { id: "news", name: "News" },
        { id: "page", name: "Page" },
      ],
      activeId: "page",
    });
    const buttons = Array.from(container!.querySelectorAll("button"));
    const news = buttons.find((button) => button.textContent === "News");
    const page = buttons.find((button) => button.textContent === "Page");
    expect(news!.className).toContain("text-muted-foreground");
    expect(page!.className).toContain("bg-primary/10");
  });

  test("clicking a collection calls onSelect with its id", () => {
    const { onSelect } = mount({});
    const buttons = Array.from(container!.querySelectorAll("button"));
    const blog = buttons.find((button) => button.textContent?.startsWith("Blog Post"));
    blog!.click();
    expect(onSelect).toHaveBeenCalledWith("blog");
  });

  test("clicking Create New Type calls onCreate", () => {
    const { onCreate } = mount({});
    const buttons = Array.from(container!.querySelectorAll("button"));
    const create = buttons.find((button) => button.textContent === "Create New Type");
    create!.click();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  test("renders the filter input", () => {
    mount({});
    const filter = container!.querySelector<HTMLInputElement>(
      'input[placeholder="Filter types..."]'
    );
    expect(filter).not.toBeNull();
  });
});
