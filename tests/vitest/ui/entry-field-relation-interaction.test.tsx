// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

const entriesClient = vi.hoisted(() => ({
  listEntriesCached: vi.fn(async () => [
    {
      id: "related-1",
      typeId: "articles-type",
      title: "Linked entry",
      slug: "linked-entry",
      status: "published" as const,
      visibility: "public" as const,
      hasPassword: false,
      data: {},
      createdAt: "2026-07-18T10:00:00.000Z",
      updatedAt: "2026-07-18T10:00:00.000Z",
      author: null,
    },
    {
      id: "related-2",
      typeId: "articles-type",
      title: "Second reference",
      slug: "second-reference",
      status: "draft" as const,
      visibility: "private" as const,
      hasPassword: false,
      data: {},
      createdAt: "2026-07-18T11:00:00.000Z",
      updatedAt: "2026-07-18T11:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/services/entriesClient", async () => {
  const actual = await vi.importActual<typeof import("@/services/entriesClient")>(
    "@/services/entriesClient"
  );
  return {
    ...actual,
    listEntriesCached: entriesClient.listEntriesCached,
  };
});

import { FieldRenderer } from "../../../core/admin/ui/entries/FieldRenderer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const formatConsoleArgument = (value: unknown) => {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("multiple relation rows remain valid single-button controls with a visual selection indicator", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onChange = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  try {
    React.act(() => {
      root.render(
        <FieldRenderer
          field={{
            id: "field-relation-multiple",
            name: "linked-posts",
            type: "relation",
            label: "Linked posts",
            relation: { target: "articles", multiple: true },
          }}
          value={["related-1"]}
          onChange={onChange}
          relationTargets={[{ slug: "articles", name: "Articles" }]}
        />
      );
    });
    await flush();

    expect(entriesClient.listEntriesCached).toHaveBeenCalledWith("articles", { force: true });

    const rows = ["Linked entry", "Second reference"].map((title) => {
      const titleNode = Array.from(container.querySelectorAll("p")).find(
        (candidate) => candidate.textContent === title
      );
      const row = titleNode?.closest("button") ?? null;
      expect(row, `relation row for ${title}`).not.toBeNull();
      return row as HTMLButtonElement;
    });

    const nestingErrors = consoleError.mock.calls
      .map((call) => call.map(formatConsoleArgument).join(" "))
      .filter((message) => /button.*(?:descendant|nested|contain).*button/i.test(message));

    expect.soft(nestingErrors).toEqual([]);
    expect.soft(container.querySelector("button button")).toBeNull();
    expect.soft(container.querySelectorAll("button")).toHaveLength(rows.length);
    for (const row of rows) {
      expect.soft(row.querySelectorAll("button")).toHaveLength(0);
    }

    expect.soft(rows[0]?.getAttribute("aria-pressed")).toBe("true");
    expect.soft(rows[1]?.getAttribute("aria-pressed")).toBe("false");

    const indicators = rows.map((row) =>
      row.querySelector('[data-relation-selection-indicator="true"]')
    );
    expect.soft(indicators.every((indicator) => indicator !== null)).toBe(true);
    expect
      .soft(indicators.every((indicator) => indicator?.getAttribute("aria-hidden") === "true"))
      .toBe(true);
    expect.soft(indicators[0]?.getAttribute("data-state")).toBe("checked");
    expect.soft(indicators[1]?.getAttribute("data-state")).toBe("unchecked");
    expect
      .soft(indicators[0]?.querySelector('[data-relation-selection-check="true"]'))
      .not.toBeNull();
    expect.soft(indicators[1]?.querySelector('[data-relation-selection-check="true"]')).toBeNull();

    React.act(() => {
      rows[1]?.click();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(["related-1", "related-2"]);

    // Toggle-OFF branch: re-render with the updated value, then clicking an
    // already-selected row removes it from the value.
    React.act(() => {
      root.render(
        <FieldRenderer
          field={{
            id: "field-relation-multiple",
            name: "linked-posts",
            type: "relation",
            label: "Linked posts",
            relation: { target: "articles", multiple: true },
          }}
          value={["related-1", "related-2"]}
          onChange={onChange}
          relationTargets={[{ slug: "articles", name: "Articles" }]}
        />
      );
    });
    React.act(() => {
      rows[0]?.click();
    });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(["related-2"]);
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
    consoleError.mockRestore();
  }
});
