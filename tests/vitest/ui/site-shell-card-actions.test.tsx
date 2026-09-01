// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { type MenuSummary } from "../../../core/admin/services/menusClient";
import { type PageTemplateSummary } from "../../../core/admin/services/pageTemplatesClient";
import { SiteShellCard } from "../../../core/admin/ui/site/SiteShellCard";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const menuSummary = (
  id: string,
  name: string,
  status: MenuSummary["status"] = "published"
): MenuSummary => ({
  id,
  name,
  location: null,
  status,
  publishedAt: status === "published" ? "2026-06-10T00:00:00.000Z" : null,
  createdAt: "2026-06-01T00:00:00.000Z",
});

const templateSummary = (
  id: string,
  name: string,
  status: PageTemplateSummary["status"] = "published"
): PageTemplateSummary => ({
  id,
  name,
  slug: id,
  description: null,
  category: null,
  status,
  sectionsCount: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
});

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

test("SiteShellCard pickers map select changes onto navigation menu values", async () => {
  const changed: Array<{ navigationMenuId: string | null; footerTemplateId: string | null }> = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await React.act(async () => {
      root.render(
        <SiteShellCard
          values={{ navigationMenuId: null, footerTemplateId: "template-draft" }}
          menus={[menuSummary("menu-published", "Main menu")]}
          templates={[
            templateSummary("template-published", "Footer columns"),
            templateSummary("template-draft", "Draft footer", "draft"),
          ]}
          onChange={(next) => changed.push(next)}
        />
      );
    });
    await flushEffects();

    const selects = Array.from(container.querySelectorAll("select")) as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    const menuSelect = selects[0];
    const templateSelect = selects[1];

    expect(menuSelect.value).toBe("none");
    expect(templateSelect.value).toBe("template-draft");
    expect(menuSelect.textContent).toContain("None");
    expect(menuSelect.textContent).toContain("Main menu");
    expect(templateSelect.textContent).toContain("Draft footer (not published — hidden on site)");

    React.act(() => {
      menuSelect.value = "menu-published";
      menuSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(changed).toEqual([
      { navigationMenuId: "menu-published", footerTemplateId: "template-draft" },
    ]);

    React.act(() => {
      menuSelect.value = "none";
      menuSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(changed[1]).toEqual({
      navigationMenuId: null,
      footerTemplateId: "template-draft",
    });

    React.act(() => {
      templateSelect.value = "template-published";
      templateSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(changed[2]).toEqual({
      navigationMenuId: null,
      footerTemplateId: "template-published",
    });
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("SiteShellCard disabled pickers cannot fire changes", async () => {
  const changed: Array<{ navigationMenuId: string | null; footerTemplateId: string | null }> = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await React.act(async () => {
      root.render(
        <SiteShellCard
          values={{ navigationMenuId: "menu-published", footerTemplateId: null }}
          menus={[menuSummary("menu-published", "Main menu")]}
          templates={[templateSummary("template-published", "Footer columns")]}
          disabled
          onChange={(next) => changed.push(next)}
        />
      );
    });
    await flushEffects();

    const selects = Array.from(container.querySelectorAll("select")) as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    expect(selects.every((select) => select.disabled)).toBe(true);
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});
