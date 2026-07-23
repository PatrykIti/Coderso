// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

const FIRST_ENTRY_ID = "54000000-0000-4000-8000-000000000001";
const SECOND_ENTRY_ID = "54000000-0000-4000-8000-000000000002";

const entriesClient = vi.hoisted(() => ({
  listEntriesCached: vi.fn(async () => [
    {
      id: FIRST_ENTRY_ID,
      typeId: "articles-type",
      title: "Shared title",
      slug: "first-entry",
      status: "published" as const,
      visibility: "public" as const,
      hasPassword: false,
      data: {},
      createdAt: "2026-07-19T10:00:00.000Z",
      updatedAt: "2026-07-19T10:00:00.000Z",
      author: null,
    },
    {
      id: SECOND_ENTRY_ID,
      typeId: "articles-type",
      title: "Shared title",
      slug: "second-entry",
      status: "draft" as const,
      visibility: "private" as const,
      hasPassword: false,
      data: {},
      createdAt: "2026-07-19T11:00:00.000Z",
      updatedAt: "2026-07-19T11:00:00.000Z",
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
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { MediaPicker } from "../../../core/admin/ui/media/MediaPicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const mediaRecord = (id: string): MediaRecord => ({
  id,
  key: `${id}.png`,
  url: `https://example.com/${id}.png`,
  type: "image",
  mimeType: "image/png",
  size: 2048,
  width: 100,
  height: 100,
  alt: null,
  title: "Shared media title",
  caption: null,
  originalName: `${id}.png`,
  createdAt: "2026-07-19T12:00:00.000Z",
  createdBy: null,
});

const writeMediaCache = (rows: MediaRecord[]) => {
  window.localStorage.setItem(
    cacheKeys.mediaList,
    JSON.stringify({ value: rows, savedAt: Date.now() })
  );
};

test("multiple relation options expose entry identity independently from duplicate titles", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onChange = vi.fn();

  try {
    React.act(() => {
      root.render(
        <FieldRenderer
          field={{
            id: "field-relation-identity",
            name: "linked-articles",
            type: "relation",
            label: "Linked articles",
            relation: { target: "articles", multiple: true },
          }}
          value={[FIRST_ENTRY_ID]}
          onChange={onChange}
          relationTargets={[{ slug: "articles", name: "Articles" }]}
        />
      );
    });
    await flush();

    expect(entriesClient.listEntriesCached).toHaveBeenCalledWith("articles", { force: true });

    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[data-screen-relation-option-id]")
    );
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.dataset.screenRelationOptionId)).toEqual([
      FIRST_ENTRY_ID,
      SECOND_ENTRY_ID,
    ]);
    expect(options.map((option) => option.querySelector("p")?.textContent)).toEqual([
      "Shared title",
      "Shared title",
    ]);

    expect(options[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(options[1]?.getAttribute("aria-pressed")).toBe("false");
    expect(
      options[0]
        ?.querySelector('[data-relation-selection-indicator="true"]')
        ?.getAttribute("data-state")
    ).toBe("checked");
    expect(
      options[1]
        ?.querySelector('[data-relation-selection-indicator="true"]')
        ?.getAttribute("data-state")
    ).toBe("unchecked");

    React.act(() => {
      options[1]?.click();
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([FIRST_ENTRY_ID, SECOND_ENTRY_ID]);
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("selected media roots expose every asset identity and preserve remove behavior", async () => {
  const firstMediaId = "54000000-0000-4000-8000-000000000011";
  const secondMediaId = "54000000-0000-4000-8000-000000000012";
  clearMediaCache();
  writeMediaCache([mediaRecord(firstMediaId), mediaRecord(secondMediaId)]);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onChange = vi.fn();

  try {
    React.act(() => {
      root.render(
        <MediaPicker value={[firstMediaId, secondMediaId]} onChange={onChange} multiple />
      );
    });
    await flush();

    const selectedItems = Array.from(
      container.querySelectorAll<HTMLElement>("[data-media-picker-selected-id]")
    );
    expect(selectedItems).toHaveLength(2);
    expect(selectedItems.map((item) => item.dataset.mediaPickerSelectedId)).toEqual([
      firstMediaId,
      secondMediaId,
    ]);
    expect(selectedItems.map((item) => item.querySelector("p")?.textContent)).toEqual([
      "Shared media title",
      "Shared media title",
    ]);

    const secondRemove = selectedItems[1]?.querySelector<HTMLButtonElement>("button");
    expect(secondRemove).toBeInstanceOf(HTMLButtonElement);
    React.act(() => {
      secondRemove?.click();
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([firstMediaId]);
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
    clearMediaCache();
    window.localStorage.clear();
  }
});
