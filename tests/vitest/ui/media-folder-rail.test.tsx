// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  FOLDER_RETRY_NAMES,
  MediaFolderRail,
  type FolderOperationFeedback,
  type FolderRetryResult,
} from "../../../core/admin/ui/media/MediaFolderRail";
import {
  FOLDER_OPERATION_MESSAGES,
  boundedFolderDisplayName,
  cloneFolderOperation,
} from "../../../core/admin/ui/media/MediaLibraryPage";
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
  { id: "f3", name: "Q1", slug: "q1", parentId: "f1", orderIndex: 0, createdAt: "" },
];

const baseProps = () => ({
  folders,
  folderTree: buildFolderTree(folders),
  typeCounts: { all: 10, image: 5, video: 2, document: 2, audio: 1 } as Record<
    "all" | "image" | "video" | "document" | "audio",
    number
  >,
  folderCounts: { f1: 4, f2: 2, f3: 1 } as Record<string, number>,
  activeFolderId: null as string | null,
  activeType: "all" as const,
  onSelectType: vi.fn(),
  onSelectFolder: vi.fn(),
  onCreateFolder: vi.fn(async () => true),
  onRenameFolder: vi.fn(async () => true),
  onDeleteFolder: vi.fn(async () => true),
  onReorder: vi.fn(async () => true),
  folderError: null as FolderOperationFeedback | null,
  pendingKind: null,
  onRetry: vi.fn(async () => null),
});

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
  return { container, render };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

const findByAria = (c: ParentNode, label: string) =>
  Array.from(c.querySelectorAll("button")).find((b) => b.getAttribute("aria-label") === label);

test("MediaFolderRail renders type filters and the nested folder tree with counts", () => {
  const container = mount(<MediaFolderRail {...baseProps()} />);
  const text = container.textContent ?? "";
  expect(text).toContain("All files");
  expect(text).toContain("Images");
  expect(text).toContain("Marketing");
  expect(text).toContain("Docs");
  expect(text).toContain("Q1");
  // recursive count supplied by the page
  expect(text).toContain("4");
});

test("MediaFolderRail marks the active folder with the prototype soft-violet tokens", () => {
  const container = mount(<MediaFolderRail {...baseProps()} activeFolderId="f1" />);
  const marketingButton = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Marketing")
  );
  const row = marketingButton?.closest("div");
  expect(row?.className).toContain("bg-primary-soft");
  expect(row?.className).toContain("text-primary-soft-foreground");
});

test("MediaFolderRail fires onSelectFolder when a folder row is clicked", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  const docsButton = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Docs"
  );
  click(docsButton);
  expect(props.onSelectFolder).toHaveBeenCalledWith("f2");
});

test("MediaFolderRail creates a top-level folder", async () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "New folder"));
  const input = container.querySelector('input[aria-label="New folder name"]') as HTMLInputElement;
  typeInto(input, "Campaigns");
  click(findByAria(container, "Create folder"));
  expect(props.onCreateFolder).toHaveBeenCalledWith("Campaigns", null, expect.any(Number));
  await flush();
});

test("MediaFolderRail renames a folder inline", async () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Docs"));
  const input = container.querySelector(
    'input[aria-label="Rename folder Docs"]'
  ) as HTMLInputElement;
  typeInto(input, "Documents");
  click(findByAria(container, "Save folder name"));
  expect(props.onRenameFolder).toHaveBeenCalledWith("f2", "Documents", expect.any(Number));
  await flush();
});

test("MediaFolderRail deletes a folder after confirmation", () => {
  const props = baseProps();
  const original = window.confirm;
  window.confirm = vi.fn(() => true) as unknown as typeof window.confirm;
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Delete Docs"));
  expect(props.onDeleteFolder).toHaveBeenCalledWith("f2", "Docs");
  window.confirm = original;
});

test("MediaFolderRail reorders siblings, emitting new orderIndex values", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Move Marketing down"));
  expect(props.onReorder).toHaveBeenCalledWith([
    { id: "f2", orderIndex: 0, parentId: null },
    { id: "f1", orderIndex: 1, parentId: null },
  ]);
});

test("create waits for success, retains and refocuses a failed draft, then matching Retry closes it", async () => {
  const request = deferred<boolean>();
  const props = {
    ...baseProps(),
    onCreateFolder: vi.fn(() => request.promise),
  };
  const view = mountControlled(props);
  click(findByAria(view.container, "New folder"));
  const input = view.container.querySelector(
    'input[aria-label="New folder name"]'
  ) as HTMLInputElement;
  typeInto(input, "Campaigns");
  const form = input.closest("form");
  const generation = Number(form?.getAttribute("data-folder-form-generation"));
  click(findByAria(view.container, "Create folder"));

  expect(input.value).toBe("Campaigns");
  const cancel = findByAria(view.container, "Cancel create folder") as HTMLButtonElement;
  cancel.focus();
  expect(document.activeElement).toBe(cancel);
  request.resolve(false);
  await flush();
  expect(view.container.querySelector('input[aria-label="New folder name"]')).toBe(input);
  expect(document.activeElement).toBe(input);

  const target = Object.freeze({
    kind: "create" as const,
    name: "Campaigns",
    parentId: null,
    formGeneration: generation,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 41,
    kind: "create",
    target,
    message: "Folder could not be created. Retry when ready.",
    retry: Object.freeze({ ...target }),
  });
  const onRetry = vi.fn(async () =>
    Object.freeze({ ok: true, token: 41, kind: "create" as const, target })
  );
  view.render({ ...props, folderError: feedback, onRetry });

  const retry = view.container.querySelector('[data-folder-retry-token="41"]');
  expect(retry?.textContent).toBe(FOLDER_RETRY_NAMES.create);
  expect(retry?.getAttribute("data-folder-retry-name")).toBe("Campaigns");
  expect(retry?.hasAttribute("data-folder-retry-target-id")).toBe(false);
  expect(retry?.getAttribute("data-folder-retry-parent-id")).toBe("");
  click(retry);
  await flush();
  expect(onRetry).toHaveBeenCalledWith(41);
  expect(view.container.querySelector('input[aria-label="New folder name"]')).toBeNull();
});

test("a stale create completion cannot close a cancelled and reopened form generation", async () => {
  const request = deferred<boolean>();
  const props = {
    ...baseProps(),
    onCreateFolder: vi.fn(() => request.promise),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "New folder"));
  const first = container.querySelector('input[aria-label="New folder name"]') as HTMLInputElement;
  typeInto(first, "Old draft");
  const firstGeneration = first.closest("form")?.getAttribute("data-folder-form-generation");
  click(findByAria(container, "Create folder"));
  click(findByAria(container, "Cancel create folder"));
  click(findByAria(container, "New folder"));
  const reopened = container.querySelector(
    'input[aria-label="New folder name"]'
  ) as HTMLInputElement;
  typeInto(reopened, "New draft");
  const nextGeneration = reopened.closest("form")?.getAttribute("data-folder-form-generation");
  expect(nextGeneration).not.toBe(firstGeneration);

  request.resolve(true);
  await flush();
  expect(
    (container.querySelector('input[aria-label="New folder name"]') as HTMLInputElement).value
  ).toBe("New draft");
});

test("a deferred successful create Retry cannot close a form whose draft changed before resolution", async () => {
  const retryResult = deferred<FolderRetryResult | null>();
  const target = Object.freeze({
    kind: "create" as const,
    name: "Campaigns",
    parentId: null,
    formGeneration: 1,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 61,
    kind: "create",
    target,
    message: FOLDER_OPERATION_MESSAGES.create,
    retry: Object.freeze({ ...target }),
  });
  const props = {
    ...baseProps(),
    folderError: feedback,
    onRetry: vi.fn(() => retryResult.promise),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "New folder"));
  const input = container.querySelector('input[aria-label="New folder name"]') as HTMLInputElement;
  typeInto(input, "Campaigns");
  expect(input.closest("form")?.getAttribute("data-folder-form-generation")).toBe("1");
  click(container.querySelector('[data-folder-retry-token="61"]'));
  typeInto(input, "Changed draft");

  retryResult.resolve(Object.freeze({ ok: true, token: 61, kind: "create", target }));
  await flush();
  const retained = container.querySelector(
    'input[aria-label="New folder name"]'
  ) as HTMLInputElement;
  expect(retained).toBe(input);
  expect(retained.value).toBe("Changed draft");
});

test("rename keeps row identity and active prototype state while a failed draft remains open", async () => {
  const request = deferred<boolean>();
  const props = {
    ...baseProps(),
    activeFolderId: "f2",
    onRenameFolder: vi.fn(() => request.promise),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Docs"));
  const row = container.querySelector('[data-media-folder-id="f2"]');
  expect(row?.getAttribute("data-media-folder-name")).toBe("Docs");
  expect(row?.getAttribute("aria-current")).toBe("true");
  expect(row?.className).toContain("bg-primary-soft");
  const input = container.querySelector(
    'input[aria-label="Rename folder Docs"]'
  ) as HTMLInputElement;
  typeInto(input, "Documents");
  click(findByAria(container, "Save folder name"));
  const cancel = findByAria(container, "Cancel rename") as HTMLButtonElement;
  cancel.focus();
  expect(document.activeElement).toBe(cancel);
  request.resolve(false);
  await flush();
  expect(input.value).toBe("Documents");
  expect(document.activeElement).toBe(input);
});

test("a stale rename completion cannot close a cancelled form reopened for another target", async () => {
  const request = deferred<boolean>();
  const props = {
    ...baseProps(),
    onRenameFolder: vi.fn(() => request.promise),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Docs"));
  const first = container.querySelector(
    'input[aria-label="Rename folder Docs"]'
  ) as HTMLInputElement;
  typeInto(first, "Documents");
  const firstGeneration = first.closest("form")?.getAttribute("data-folder-form-generation");
  click(findByAria(container, "Save folder name"));
  click(findByAria(container, "Cancel rename"));
  click(findByAria(container, "Rename Marketing"));
  const reopened = container.querySelector(
    'input[aria-label="Rename folder Marketing"]'
  ) as HTMLInputElement;
  typeInto(reopened, "Brand");
  expect(reopened.closest("form")?.getAttribute("data-folder-form-generation")).not.toBe(
    firstGeneration
  );

  request.resolve(true);
  await flush();
  expect(
    (container.querySelector('input[aria-label="Rename folder Marketing"]') as HTMLInputElement)
      .value
  ).toBe("Brand");
});

test("a deferred successful rename Retry cannot close a cancelled form reopened for another generation and target", async () => {
  const retryResult = deferred<FolderRetryResult | null>();
  const target = Object.freeze({
    kind: "rename" as const,
    folderId: "f2",
    name: "Documents",
    formGeneration: 1,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 62,
    kind: "rename",
    target,
    message: FOLDER_OPERATION_MESSAGES.rename,
    retry: Object.freeze({
      kind: "rename",
      id: "f2",
      name: "Documents",
      formGeneration: 1,
    }),
  });
  const props = {
    ...baseProps(),
    folderError: feedback,
    onRetry: vi.fn(() => retryResult.promise),
  };
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Docs"));
  const first = container.querySelector(
    'input[aria-label="Rename folder Docs"]'
  ) as HTMLInputElement;
  typeInto(first, "Documents");
  expect(first.closest("form")?.getAttribute("data-folder-form-generation")).toBe("1");
  click(container.querySelector('[data-folder-retry-token="62"]'));
  click(findByAria(container, "Cancel rename"));
  click(findByAria(container, "Rename Marketing"));
  const reopened = container.querySelector(
    'input[aria-label="Rename folder Marketing"]'
  ) as HTMLInputElement;
  typeInto(reopened, "Brand");

  retryResult.resolve(Object.freeze({ ok: true, token: 62, kind: "rename", target }));
  await flush();
  const retained = container.querySelector(
    'input[aria-label="Rename folder Marketing"]'
  ) as HTMLInputElement;
  expect(retained).toBe(reopened);
  expect(retained.value).toBe("Brand");
});

test("pending state is announced and disables duplicate server actions without blocking form cancellation", () => {
  const props = { ...baseProps(), pendingKind: "create" as const };
  const container = mount(<MediaFolderRail {...props} />);
  const rail = container.querySelector("[data-media-folder-rail]");
  expect(rail?.getAttribute("aria-busy")).toBe("true");
  expect(findByAria(container, "Delete Docs")?.hasAttribute("disabled")).toBe(true);
  expect(findByAria(container, "Move Marketing down")?.hasAttribute("disabled")).toBe(true);
  expect(findByAria(container, "New folder")?.hasAttribute("disabled")).toBe(false);
  expect(findByAria(container, "Rename Docs")?.hasAttribute("disabled")).toBe(false);
});

test("folder rows expose deterministic state and action visibility for focus, narrow, hover-none, and coarse pointers", () => {
  const container = mount(<MediaFolderRail {...baseProps()} activeFolderId="f1" />);
  const rail = container.querySelector("[data-media-folder-rail]");
  expect(rail?.getAttribute("data-active-folder-id")).toBe("f1");
  const parent = container.querySelector('[data-media-folder-id="f1"]');
  const child = container.querySelector('[data-media-folder-id="f3"]');
  expect(parent?.getAttribute("data-media-folder-name")).toBe("Marketing");
  expect(parent?.hasAttribute("data-media-folder-parent-id")).toBe(false);
  expect(child?.getAttribute("data-media-folder-parent-id")).toBe("f1");
  expect(parent?.getAttribute("aria-current")).toBe("true");
  const actions = parent?.querySelector("[data-media-folder-actions]");
  expect(actions?.className).toContain("group-focus-within:inline-flex");
  expect(actions?.className).toContain("max-lg:inline-flex");
  expect(actions?.className).toContain("[@media(hover:none)]:inline-flex");
  expect(actions?.className).toContain("[@media(pointer:coarse)]:inline-flex");
});

test("initial delete cancel sends no request and explicit failure Retry does not confirm twice", async () => {
  const originalConfirm = window.confirm;
  const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
  window.confirm = confirm as typeof window.confirm;
  const props = baseProps();
  const view = mountControlled(props);
  click(findByAria(view.container, "Delete Docs"));
  expect(props.onDeleteFolder).not.toHaveBeenCalled();
  click(findByAria(view.container, "Delete Docs"));
  expect(props.onDeleteFolder).toHaveBeenCalledWith("f2", "Docs");

  const target = Object.freeze({ kind: "delete" as const, folderId: "f2" });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 9,
    kind: "delete",
    target,
    message: "Folder could not be deleted. Retry when ready.",
    retry: Object.freeze({ kind: "delete", id: "f2", name: "Docs" }),
    displayFolderName: "Docs",
  });
  const onRetry = vi.fn(async () =>
    Object.freeze({ ok: true, token: 9, kind: "delete" as const, target })
  );
  view.render({ ...props, folderError: feedback, onRetry });
  const retry = view.container.querySelector('[data-folder-retry-kind="delete"]');
  expect(retry?.textContent).toBe(`${FOLDER_RETRY_NAMES.deletePrefix}Docs`);
  click(retry);
  await flush();
  expect(onRetry).toHaveBeenCalledWith(9);
  expect(confirm).toHaveBeenCalledTimes(2);
  window.confirm = originalConfirm;
});

test("fixed error copy and retry observability omit raw details and inapplicable attributes", () => {
  const target = Object.freeze({ kind: "load" as const });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 12,
    kind: "load",
    target,
    message: "Folders could not be loaded. Retry the request.",
    retry: target,
  });
  const container = mount(<MediaFolderRail {...baseProps()} folderError={feedback} />);
  const alert = container.querySelector('[role="alert"]');
  expect(alert?.getAttribute("data-folder-error-token")).toBe("12");
  expect(alert?.getAttribute("data-folder-error-kind")).toBe("load");
  expect(alert?.querySelector("[data-folder-error-message]")?.textContent).toBe(feedback.message);
  const retry = alert?.querySelector("button");
  expect(retry?.textContent).toBe(FOLDER_RETRY_NAMES.load);
  expect(retry?.hasAttribute("data-folder-retry-name")).toBe(false);
  expect(retry?.hasAttribute("data-folder-retry-target-id")).toBe(false);
  expect(retry?.hasAttribute("data-folder-retry-parent-id")).toBe(false);
  expect(container.innerHTML).not.toContain("SQL");
});

test("null and mismatched Retry results have zero focus or form side effects", async () => {
  const target = Object.freeze({
    kind: "create" as const,
    name: "Campaigns",
    parentId: null,
    formGeneration: 1,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 5,
    kind: "create",
    target,
    message: FOLDER_OPERATION_MESSAGES.create,
    retry: Object.freeze({ ...target }),
  });
  const results = [
    null,
    Object.freeze({ ok: false, token: 6, kind: "create" as const, target }),
    Object.freeze({
      ok: false,
      token: 5,
      kind: "create" as const,
      target: Object.freeze({ ...target, name: "Different" }),
    }),
  ];

  for (const result of results) {
    const props = { ...baseProps(), folderError: feedback, onRetry: vi.fn(async () => result) };
    const container = mount(<MediaFolderRail {...props} />);
    click(findByAria(container, "New folder"));
    const input = container.querySelector(
      'input[aria-label="New folder name"]'
    ) as HTMLInputElement;
    typeInto(input, "Campaigns");
    const retry = container.querySelector('[data-folder-retry-token="5"]') as HTMLButtonElement;
    retry.focus();
    click(retry);
    await flush();
    expect(document.activeElement).toBe(retry);
    expect(input.value).toBe("Campaigns");
    expect(container.querySelector('input[aria-label="New folder name"]')).toBe(input);
  }
});

test("all operation kinds expose the complete literal safe attribute matrix and omit inapplicable values", () => {
  const reorderOrders = Object.freeze([Object.freeze({ id: "f2", orderIndex: 0, parentId: null })]);
  const cases: Array<{
    feedback: FolderOperationFeedback;
    retryLabel: string;
    name: string | null;
    targetId: string | null;
    parentId: string | null;
    formGeneration: string | null;
  }> = [
    {
      feedback: Object.freeze({
        token: 1,
        kind: "load",
        target: Object.freeze({ kind: "load" }),
        message: FOLDER_OPERATION_MESSAGES.load,
        retry: Object.freeze({ kind: "load" }),
      }),
      retryLabel: FOLDER_RETRY_NAMES.load,
      name: null,
      targetId: null,
      parentId: null,
      formGeneration: null,
    },
    {
      feedback: Object.freeze({
        token: 2,
        kind: "create",
        target: Object.freeze({
          kind: "create",
          name: "Campaigns",
          parentId: "f1",
          formGeneration: 12,
        }),
        message: FOLDER_OPERATION_MESSAGES.create,
        retry: Object.freeze({
          kind: "create",
          name: "Campaigns",
          parentId: "f1",
          formGeneration: 12,
        }),
      }),
      retryLabel: FOLDER_RETRY_NAMES.create,
      name: "Campaigns",
      targetId: null,
      parentId: "f1",
      formGeneration: "12",
    },
    {
      feedback: Object.freeze({
        token: 3,
        kind: "rename",
        target: Object.freeze({
          kind: "rename",
          folderId: "f2",
          name: "Documents",
          formGeneration: 13,
        }),
        message: FOLDER_OPERATION_MESSAGES.rename,
        retry: Object.freeze({
          kind: "rename",
          id: "f2",
          name: "Documents",
          formGeneration: 13,
        }),
      }),
      retryLabel: FOLDER_RETRY_NAMES.rename,
      name: "Documents",
      targetId: "f2",
      parentId: null,
      formGeneration: "13",
    },
    {
      feedback: Object.freeze({
        token: 4,
        kind: "reorder",
        target: Object.freeze({ kind: "reorder", orders: reorderOrders }),
        message: FOLDER_OPERATION_MESSAGES.reorder,
        retry: Object.freeze({ kind: "reorder", orders: reorderOrders }),
      }),
      retryLabel: FOLDER_RETRY_NAMES.reorder,
      name: null,
      targetId: null,
      parentId: null,
      formGeneration: null,
    },
    {
      feedback: Object.freeze({
        token: 5,
        kind: "delete",
        target: Object.freeze({ kind: "delete", folderId: "f2" }),
        message: FOLDER_OPERATION_MESSAGES.delete,
        retry: Object.freeze({ kind: "delete", id: "f2", name: "Docs" }),
        displayFolderName: "Docs",
      }),
      retryLabel: `${FOLDER_RETRY_NAMES.deletePrefix}Docs`,
      name: "Docs",
      targetId: "f2",
      parentId: null,
      formGeneration: null,
    },
  ];

  for (const entry of cases) {
    const feedbackWithIgnoredRawTransport = Object.freeze({
      ...entry.feedback,
      rawServerError: "RAW_SQL_<script>stack</script>",
    }) as FolderOperationFeedback;
    const container = mount(
      <MediaFolderRail {...baseProps()} folderError={feedbackWithIgnoredRawTransport} />
    );
    const alert = container.querySelector("[data-folder-error-token]");
    expect(alert?.getAttribute("data-folder-error-token")).toBe(String(entry.feedback.token));
    expect(alert?.getAttribute("data-folder-error-kind")).toBe(entry.feedback.kind);
    expect(alert?.querySelector("[data-folder-error-message]")?.textContent).toBe(
      entry.feedback.message
    );
    const retry = alert?.querySelector("button");
    expect(retry?.textContent).toBe(entry.retryLabel);
    expect(retry?.getAttribute("data-folder-retry-token")).toBe(String(entry.feedback.token));
    expect(retry?.getAttribute("data-folder-retry-kind")).toBe(entry.feedback.kind);
    expect(retry?.getAttribute("data-folder-retry-name")).toBe(entry.name);
    expect(retry?.getAttribute("data-folder-retry-target-id")).toBe(entry.targetId);
    expect(retry?.getAttribute("data-folder-retry-parent-id")).toBe(entry.parentId);
    expect(retry?.getAttribute("data-folder-retry-form-generation")).toBe(entry.formGeneration);
    expect(container.innerHTML).not.toContain("RAW_SQL_<script>");
  }
});

test("create and rename forms expose only their applicable literal identity attributes", () => {
  const container = mount(<MediaFolderRail {...baseProps()} />);
  click(findByAria(container, "New folder"));
  const create = container.querySelector('[data-folder-form-kind="create"]');
  expect(create?.getAttribute("data-folder-form-generation")).toMatch(/^\d+$/u);
  expect(create?.getAttribute("data-folder-form-parent-id")).toBe("");
  expect(create?.hasAttribute("data-folder-form-target-id")).toBe(false);
  click(findByAria(container, "Cancel create folder"));

  click(findByAria(container, "Rename Docs"));
  const rename = container.querySelector('[data-folder-form-kind="rename"]');
  expect(rename?.getAttribute("data-folder-form-generation")).toMatch(/^\d+$/u);
  expect(rename?.getAttribute("data-folder-form-target-id")).toBe("f2");
  expect(rename?.hasAttribute("data-folder-form-parent-id")).toBe(false);
});

test("native controls move focus through real activation and bounded delete Retry keeps the full frozen payload out of presentation", async () => {
  const fullName = ` Folder\u0000\n${"😀".repeat(60)} `;
  const retryOperation = cloneFolderOperation({ kind: "delete", id: "f2", name: fullName });
  if (retryOperation.kind !== "delete") throw new Error("Expected delete retry");
  const displayFolderName = boundedFolderDisplayName(retryOperation.name);
  const target = Object.freeze({ kind: "delete" as const, folderId: "f2" });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 77,
    kind: "delete",
    target,
    message: "Folder could not be deleted. Retry when ready.",
    retry: retryOperation,
    displayFolderName,
  });
  const props = { ...baseProps(), folderError: feedback };
  const container = mount(<MediaFolderRail {...props} />);

  const newButton = findByAria(container, "New folder") as HTMLButtonElement;
  expect(newButton.tagName).toBe("BUTTON");
  expect(newButton.type).toBe("button");
  expect(newButton.tabIndex).toBe(0);
  React.act(() => {
    newButton.focus();
    expect(document.activeElement).toBe(newButton);
    newButton.click();
  });
  const input = container.querySelector('input[aria-label="New folder name"]');
  expect(document.activeElement).toBe(input);
  const cancel = findByAria(container, "Cancel create folder") as HTMLButtonElement;
  expect(cancel.tagName).toBe("BUTTON");
  expect(cancel.type).toBe("button");
  React.act(() => {
    cancel.focus();
    expect(document.activeElement).toBe(cancel);
    cancel.click();
  });
  expect(container.querySelector('input[aria-label="New folder name"]')).toBeNull();

  const retryButton = container.querySelector(
    '[data-folder-retry-kind="delete"]'
  ) as HTMLButtonElement;
  expect(retryButton.tagName).toBe("BUTTON");
  expect(retryButton.type).toBe("button");
  expect(retryButton.tabIndex).toBe(0);
  expect(retryButton.textContent).toBe(`${FOLDER_RETRY_NAMES.deletePrefix}${displayFolderName}`);
  expect(Array.from(displayFolderName)).toHaveLength(48);
  expect(retryButton.textContent).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/u);
  expect(retryButton.getAttribute("data-folder-retry-name")).toBe(displayFolderName);
  expect(retryOperation.name).toBe(fullName.trim());
  expect(Object.isFrozen(retryOperation)).toBe(true);
  await flush();
});
