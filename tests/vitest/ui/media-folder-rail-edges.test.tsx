// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  MediaFolderRail,
  sameFolderOperationTarget,
  type FolderOperation,
  type FolderOperationFeedback,
  type FolderOperationTarget,
  type FolderRetryResult,
  type MediaFolderReorder,
} from "../../../core/admin/ui/media/MediaFolderRail";
import type { MediaFolder } from "../../../core/admin/ui/media/types";
import { buildFolderTree } from "../../../core/admin/ui/media/utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const folders: MediaFolder[] = [
  { id: "f1", name: "Marketing", slug: "marketing", parentId: null, orderIndex: 0, createdAt: "" },
  { id: "f2", name: "Docs", slug: "docs", parentId: null, orderIndex: 1, createdAt: "" },
];

const baseProps = () =>
  ({
    folders,
    folderTree: buildFolderTree(folders),
    typeCounts: { all: 10, image: 5, video: 2, document: 2, audio: 1 },
    folderCounts: { f1: 4, f2: 2 },
    activeFolderId: null,
    activeType: "all",
    onSelectType: vi.fn((_type: "all" | "image" | "video" | "document" | "audio") => undefined),
    onSelectFolder: vi.fn((_folderId: string | null) => undefined),
    onCreateFolder: vi.fn(
      async (_name: string, _parentId: string | null, _formGeneration: number) => true
    ),
    onRenameFolder: vi.fn(async (_id: string, _name: string, _formGeneration: number) => true),
    onDeleteFolder: vi.fn(async (_id: string, _name: string) => true),
    onReorder: vi.fn(async (_orders: readonly MediaFolderReorder[]) => true),
    folderError: null,
    pendingKind: null,
    onRetry: vi.fn(async (_errorToken: number): Promise<FolderRetryResult | null> => null),
  }) satisfies React.ComponentProps<typeof MediaFolderRail>;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const mountControlled = (props: React.ComponentProps<typeof MediaFolderRail>) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (next: React.ComponentProps<typeof MediaFolderRail>) => {
    React.act(() => {
      root.render(<MediaFolderRail {...next} />);
    });
  };
  render(props);
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return {
    container,
    render,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const click = (el: Element | null | undefined) => {
  React.act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const typeInto = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const getInput = (container: ParentNode, selector: string) => {
  const input = container.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Expected input: ${selector}`);
  return input;
};

const getForm = (input: HTMLInputElement) => {
  const form = input.closest("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("Expected folder form");
  return form;
};

const findByAria = (container: ParentNode, label: string): HTMLButtonElement | null => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  return button instanceof HTMLButtonElement ? button : null;
};

const mockConfirmResult = (result: boolean) => {
  const original = Object.getOwnPropertyDescriptor(window, "confirm");
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: () => result,
  });
  return () => {
    if (original) {
      Object.defineProperty(window, "confirm", original);
    } else {
      Reflect.deleteProperty(window, "confirm");
    }
  };
};

test("sameFolderOperationTarget short-circuits on kind mismatch", () => {
  expect(
    sameFolderOperationTarget(
      { kind: "load" },
      { kind: "create", name: "x", parentId: null, formGeneration: 1 }
    )
  ).toBe(false);
});

test("clicking New folder while the create form is open closes it", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "New folder"));
  expect(container.querySelector('input[aria-label="New folder name"]')).not.toBeNull();
  click(findByAria(container, "New folder"));
  expect(container.querySelector('input[aria-label="New folder name"]')).toBeNull();
});

test("submitting an empty create form never calls onCreateFolder", async () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "New folder"));
  const input = getInput(container, 'input[aria-label="New folder name"]');
  const form = getForm(input);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flush();
  expect(props.onCreateFolder).not.toHaveBeenCalled();
});

test("submitting an empty rename form never calls onRenameFolder", async () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Marketing"));
  const input = getInput(container, 'input[aria-label="Rename folder Marketing"]');
  typeInto(input, "");
  const form = getForm(input);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flush();
  expect(props.onRenameFolder).not.toHaveBeenCalled();
});

test("a failed rename retains and refocuses the draft", async () => {
  const props = {
    ...baseProps(),
    onRenameFolder: vi.fn(async () => false),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Marketing"));
  const input = getInput(container, 'input[aria-label="Rename folder Marketing"]');
  typeInto(input, "New Name");
  click(findByAria(container, "Save folder name"));
  await flush();
  expect(container.querySelector('input[aria-label="Rename folder Marketing"]')).toBe(input);
  expect(document.activeElement).toBe(input);
});

test("move up ignores out-of-bounds indexes without calling onReorder", async () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  // Marketing is the first sibling: moving up is out of bounds.
  click(findByAria(container, "Move Marketing up"));
  await flush();
  expect(props.onReorder).not.toHaveBeenCalled();
});

test("move down on the last sibling is ignored", async () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Move Docs down"));
  await flush();
  expect(props.onReorder).not.toHaveBeenCalled();
});

test("retry with a stale token is ignored", async () => {
  const target: FolderOperationTarget = Object.freeze({
    kind: "create" as const,
    name: "Campaigns",
    parentId: null,
    formGeneration: 7,
  });
  const retry: FolderOperation = Object.freeze({
    kind: "create",
    name: "Campaigns",
    parentId: null,
    formGeneration: 7,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 41,
    kind: "create",
    target,
    message: "Folder could not be created. Retry when ready.",
    retry,
  });
  const onRetry = vi.fn(async (_errorToken: number): Promise<FolderRetryResult | null> =>
    Object.freeze({ ok: true, token: 99, kind: "create", target })
  );
  const view = mountControlled({ ...baseProps(), folderError: feedback, onRetry });
  click(view.container.querySelector('[data-folder-retry-token="41"]'));
  await flush();
  expect(onRetry).toHaveBeenCalledWith(41);
});

test("failed create retry with a still-open matching form refocuses the input", async () => {
  const props = {
    ...baseProps(),
    onCreateFolder: vi.fn(async () => true),
  };
  const view = mountControlled(props);
  click(findByAria(view.container, "New folder"));
  const input = getInput(view.container, 'input[aria-label="New folder name"]');
  typeInto(input, "Campaigns");
  const generation = Number(getForm(input).getAttribute("data-folder-form-generation"));
  const target: FolderOperationTarget = Object.freeze({
    kind: "create" as const,
    name: "Campaigns",
    parentId: null,
    formGeneration: generation,
  });
  const retry: FolderOperation = Object.freeze({
    kind: "create",
    name: "Campaigns",
    parentId: null,
    formGeneration: generation,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 41,
    kind: "create",
    target,
    message: "Folder could not be created. Retry when ready.",
    retry,
  });
  const onRetry = vi.fn(async (_errorToken: number): Promise<FolderRetryResult | null> =>
    Object.freeze({ ok: false, token: 41, kind: "create", target })
  );
  view.render({ ...props, folderError: feedback, onRetry });
  click(view.container.querySelector('[data-folder-retry-token="41"]'));
  await flush();
  expect(document.activeElement).toBe(input);
});

test("failed rename retry with a still-open matching form refocuses the input", async () => {
  const view = mountControlled(baseProps());
  click(findByAria(view.container, "Rename Marketing"));
  const input = getInput(view.container, 'input[aria-label="Rename folder Marketing"]');
  typeInto(input, "Brand");
  const generation = Number(getForm(input).getAttribute("data-folder-form-generation"));
  const target: FolderOperationTarget = Object.freeze({
    kind: "rename" as const,
    folderId: "f1",
    name: "Brand",
    formGeneration: generation,
  });
  const retry: FolderOperation = Object.freeze({
    kind: "rename",
    id: "f1",
    name: "Brand",
    formGeneration: generation,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 42,
    kind: "rename",
    target,
    message: "Folder could not be renamed. Retry when ready.",
    retry,
  });
  const onRetry = vi.fn(async (_errorToken: number): Promise<FolderRetryResult | null> =>
    Object.freeze({ ok: false, token: 42, kind: "rename", target })
  );
  view.render({ ...baseProps(), folderError: feedback, onRetry });
  click(view.container.querySelector('[data-folder-retry-token="42"]'));
  await flush();
  expect(document.activeElement).toBe(input);
});

test("delete is skipped when the confirmation is declined", () => {
  const props = baseProps();
  const restoreConfirm = mockConfirmResult(false);
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Delete Docs"));
  expect(props.onDeleteFolder).not.toHaveBeenCalled();
  restoreConfirm();
});

test("clicking a type row fires onSelectType", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  const imagesButton = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.startsWith("Images")
  );
  if (!(imagesButton instanceof HTMLButtonElement)) throw new Error("Expected Images button");
  click(imagesButton);
  expect(props.onSelectType).toHaveBeenCalledWith("image");
});

test("move up on a middle sibling reorders siblings and calls onReorder", async () => {
  const reorderCalls: Array<readonly MediaFolderReorder[]> = [];
  const onReorder = vi.fn(async (orders: readonly MediaFolderReorder[]) => {
    reorderCalls.push(orders);
    return true;
  });
  const props = {
    ...baseProps(),
    onReorder,
    folders: [
      { id: "f1", name: "Alpha", slug: "alpha", parentId: null, orderIndex: 0, createdAt: "" },
      { id: "f2", name: "Beta", slug: "beta", parentId: null, orderIndex: 1, createdAt: "" },
      { id: "f3", name: "Gamma", slug: "gamma", parentId: null, orderIndex: 2, createdAt: "" },
    ],
  };
  props.folderTree = buildFolderTree(props.folders);
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Move Beta up"));
  await flush();
  expect(onReorder).toHaveBeenCalledTimes(1);
  const [reordered] = reorderCalls;
  if (!reordered) throw new Error("Expected reordered folders");
  expect(reordered.map((entry) => entry.id)).toEqual(["f2", "f1", "f3"]);
  expect(reordered.map((entry) => entry.orderIndex)).toEqual([0, 1, 2]);
});

test("retry with no captured error is a no-op", async () => {
  const props = {
    ...baseProps(),
    folderError: null,
    onRetry: vi.fn(async () => null),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(container.querySelector("[data-folder-retry]"));
  await flush();
  expect(props.onRetry).not.toHaveBeenCalled();
});

test("unmount during a pending rename submit ignores the late result", async () => {
  let resolveRename: ((ok: boolean) => void) | null = null;
  const props = {
    ...baseProps(),
    onRenameFolder: vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRename = resolve;
        })
    ),
  };
  const view = mountControlled(props);
  click(findByAria(view.container, "Rename Marketing"));
  const input = getInput(view.container, 'input[aria-label="Rename folder Marketing"]');
  typeInto(input, "Brand");
  click(findByAria(view.container, "Save folder name"));
  view.render({ ...baseProps(), onRenameFolder: props.onRenameFolder });
  view.cleanup();
  await React.act(async () => {
    resolveRename?.(true);
    await Promise.resolve();
  });
  expect(props.onRenameFolder).toHaveBeenCalledWith("f1", "Brand", expect.any(Number));
});

test("unmount during a pending retry ignores the late result", async () => {
  let resolveRetry: ((result: FolderRetryResult | null) => void) | null = null;
  const target: FolderOperationTarget = Object.freeze({
    kind: "create" as const,
    name: "Campaigns",
    parentId: null,
    formGeneration: 7,
  });
  const retry: FolderOperation = Object.freeze({
    kind: "create",
    name: "Campaigns",
    parentId: null,
    formGeneration: 7,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 41,
    kind: "create",
    target,
    message: "Folder could not be created. Retry when ready.",
    retry,
  });
  const onRetry = vi.fn(
    (_errorToken: number): Promise<FolderRetryResult | null> =>
      new Promise<FolderRetryResult | null>((resolve) => {
        resolveRetry = resolve;
      })
  );
  const view = mountControlled({ ...baseProps(), folderError: feedback, onRetry });
  click(view.container.querySelector('[data-folder-retry-token="41"]'));
  view.cleanup();
  await React.act(async () => {
    resolveRetry?.(Object.freeze({ ok: true, token: 41, kind: "create" as const, target }));
    await Promise.resolve();
  });
  expect(onRetry).toHaveBeenCalledWith(41);
});
