// @vitest-environment happy-dom

// TASK-105-08-08-L03 regression suite: pins the supported behavior adjacent to
// the compact pages dead-path deletions.
//   1. PagePreview is client-only: it reads the live query string and closes
//      through window.close() (the SSR fallback branch was removed).
//   2. The registry-fields `unsupported` notice is RETAINED fail-closed model
//      behavior (L03 source-owner audit): registry controls without options
//      or a valid clamp render the non-mutating notice through the public
//      RegistryControlField seam.
//   3. SegmentedControl arrow-key navigation moves focus between known option
//      buttons (the keyboard seam now binds per option) while aria-pressed,
//      disabled handling, and click commits stay unchanged.
//   4. Publishing unsaved page edits persists the draft first and publishes
//      the identical normalized document; a failed draft save aborts the
//      publish (the impossible falsy-save branch was removed).
//   5. ListItemsControl keeps rendering the owner list-item shapes (audit
//      receipt for the deferred DetailTemplateInspector owner child; the
//      scalar-element fallback at :62 stays unexecuted).

import React from "react";
import { expect, test, vi } from "vitest";

import {
  changeField,
  clickButton,
  flush,
  mount,
  pageEditorState,
  toastState,
} from "./pageEditorV2Fixtures";

import { PagePreview } from "../../../core/admin/ui/pages/PagePreview";
import { RegistryControlField } from "../../../core/admin/ui/pages/editor/PageEditorRegistryFields";
import { SegmentedControl } from "../../../core/admin/ui/pages/editorControls/SegmentedControl";
import { ListItemsControl } from "../../../core/admin/ui/pages/editorControls/ListItemsControl";
import { control } from "../../../core/services/pages/pageEditorControlDefinition";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

const setPreviewSearch = (search: string) => {
  window.history.replaceState({}, "", `/admin/pages/preview${search}`);
};

test("PagePreview renders the live query details on the client-only preview screen", () => {
  setPreviewSearch("?type=post&path=%2Fdocs&contentType=articles&slug=guide&token=tok-123");
  const view = mount(<PagePreview />);
  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("Preview Mode");
    expect(text).toContain("Type: post");
    expect(text).toContain("Path: /docs");
    expect(text).toContain("Content type: articles");
    expect(text).toContain("Slug: guide");
    expect(text).toContain("Token: tok-123");
  } finally {
    view.cleanup();
    setPreviewSearch("");
  }
});

test("PagePreview omits absent query fields and keeps the page default", () => {
  setPreviewSearch("");
  const view = mount(<PagePreview />);
  try {
    const text = view.container.textContent ?? "";
    expect(text).toContain("Type: page");
    expect(text).not.toContain("Path:");
    expect(text).not.toContain("Content type:");
    expect(text).not.toContain("Slug:");
    expect(text).not.toContain("Token:");
  } finally {
    view.cleanup();
  }
});

test("PagePreview closes through window.close from the client-only screen", () => {
  setPreviewSearch("?type=page");
  const originalClose = window.close;
  const closeSpy = vi.fn();
  window.close = closeSpy;
  const view = mount(<PagePreview />);
  try {
    const closeButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Close preview"
    );
    expect(closeButton).toBeTruthy();
    React.act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  } finally {
    window.close = originalClose;
    view.cleanup();
  }
});

const registryBlock = () =>
  createPageBlockV2("text", {
    id: "blk-registry",
    props: { text: "Stored copy.", format: "plain", align: "left" },
  });

const mountRegistryField = (definition: ReturnType<typeof control>) => {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const block = registryBlock();
  const view = mount(
    <RegistryControlField
      block={block}
      baseBlock={block}
      device="desktop"
      control={definition}
      onChange={onChange}
      onReset={onReset}
    />
  );
  return { view, onChange, onReset };
};

test("registry fields fail closed with the unsupported notice for option-less select controls", () => {
  const { view, onChange, onReset } = mountRegistryField(
    control({
      id: "block.text.props.mode",
      panel: "content",
      label: "Mode",
      target: "block",
      path: ["props", "mode"],
      input: "select",
      responsive: false,
    })
  );
  try {
    const notice = view.container.querySelector('[data-page-editor-control="unsupported"]');
    expect(notice).toBeTruthy();
    expect(notice?.getAttribute("data-page-editor-control-reason")).toBe(
      "option-control-without-options"
    );
    expect(notice?.textContent).toContain("Mode");
    expect(notice?.textContent).toContain("This value cannot be edited here.");
    // Fail-closed means non-mutating: the notice offers no commit or reset.
    expect(view.container.querySelector("button")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("registry fields fail closed with the unsupported notice for clamp-less number controls", () => {
  const { view } = mountRegistryField(
    control({
      id: "block.text.props.weight",
      panel: "content",
      label: "Weight",
      target: "block",
      path: ["props", "weight"],
      input: "number",
      responsive: false,
    })
  );
  try {
    const notice = view.container.querySelector('[data-page-editor-control="unsupported"]');
    expect(notice).toBeTruthy();
    expect(notice?.getAttribute("data-page-editor-control-reason")).toBe(
      "number-without-valid-clamp"
    );
    expect(notice?.textContent).toContain("This value cannot be edited here.");
  } finally {
    view.cleanup();
  }
});

const optionButton = (container: ParentNode, token: string) => {
  const button = container.querySelector<HTMLButtonElement>(
    `[data-page-editor-segmented-option="${token}"]`
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
};

const pressKey = (element: Element, key: string) => {
  React.act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
};

test("segmented controls move keyboard focus between known options without emitting changes", () => {
  const onChange = vi.fn();
  const view = mount(
    <SegmentedControl
      label="Align"
      value="center"
      options={["start", "center", "end"]}
      onChange={onChange}
    />
  );
  try {
    const start = optionButton(view.container, "start");
    const center = optionButton(view.container, "center");
    const end = optionButton(view.container, "end");

    expect(center.getAttribute("aria-pressed")).toBe("true");
    expect(start.getAttribute("aria-pressed")).toBe("false");

    React.act(() => {
      start.focus();
    });
    expect(document.activeElement).toBe(start);

    // ArrowRight moves focus to the next option; the selection is untouched.
    pressKey(start, "ArrowRight");
    expect(document.activeElement).toBe(center);
    expect(center.getAttribute("aria-pressed")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();

    // ArrowLeft from the first option has nowhere to move: focus stays.
    React.act(() => {
      start.focus();
    });
    pressKey(start, "ArrowLeft");
    expect(document.activeElement).toBe(start);

    // ArrowRight from the last option equally stays put.
    React.act(() => {
      end.focus();
    });
    pressKey(end, "ArrowRight");
    expect(document.activeElement).toBe(end);

    // Non-arrow keys never move focus.
    React.act(() => {
      start.focus();
    });
    pressKey(start, "ArrowDown");
    expect(document.activeElement).toBe(start);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("segmented controls keep click commits, disabled handling, and aria state", () => {
  const onChange = vi.fn();
  const view = mount(
    <SegmentedControl
      label="Align"
      value="center"
      options={["start", "center"]}
      onChange={onChange}
    />
  );
  try {
    const start = optionButton(view.container, "start");
    React.act(() => {
      start.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onChange).toHaveBeenCalledWith("start");

    // Clicking the already-active option stays a no-op without the
    // commitActiveOption pin used by inherited responsive fields.
    const center = optionButton(view.container, "center");
    React.act(() => {
      center.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(center.getAttribute("aria-pressed")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("disabled segmented controls present disabled options and reject commits", () => {
  const onChange = vi.fn();
  const view = mount(
    <SegmentedControl
      label="Align"
      value="start"
      options={["start", "center"]}
      onChange={onChange}
      disabled
    />
  );
  try {
    const center = optionButton(view.container, "center");
    expect(center.disabled).toBe(true);
    React.act(() => {
      center.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

const mountEditor = async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  await flush();
  return view;
};

test("publishing unsaved edits saves the draft first and publishes the identical document", async () => {
  const view = await mountEditor();
  try {
    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    changeField(view.container, "Primary text", "Mobile headline");
    await flush();

    pageEditorState.publishPage.mockClear();
    pageEditorState.updatePage.mockClear();
    clickButton(view.container, "Publish");
    await flush();
    await flush();

    // The draft-save path ran before the publish transport.
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    const savedData = pageEditorState.updatePage.mock.calls[0]?.[1]?.data as {
      sections?: Array<{ blocks?: Array<{ id?: string; responsive?: unknown }> }>;
    };
    const savedHeading = savedData?.sections?.[0]?.blocks?.find(
      (block) => block.id === "blk-heading"
    );
    expect(savedHeading?.responsive).toEqual({ mobile: { props: { text: "Mobile headline" } } });

    // Publishing carries the exact normalized document the draft save returned.
    expect(pageEditorState.publishPage).toHaveBeenCalledTimes(1);
    const [publishedId, publishedData] = pageEditorState.publishPage.mock.calls[0] ?? [];
    expect(publishedId).toBe("page-1");
    expect(publishedData).toEqual(savedData);
    expect(toastState.success).toHaveBeenCalledWith("Page published.");
    expect(pageEditorState.currentPage?.status).toBe("published");
  } finally {
    view.cleanup();
  }
});

test("a failed draft save aborts the publish and surfaces the save error", async () => {
  const view = await mountEditor();
  try {
    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    changeField(view.container, "Primary text", "Mobile headline");
    await flush();

    pageEditorState.updatePage.mockRejectedValueOnce(new Error("Draft save rejected."));
    pageEditorState.publishPage.mockClear();
    clickButton(view.container, "Publish");
    await flush();
    await flush();

    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    expect(pageEditorState.publishPage).not.toHaveBeenCalled();
    expect(toastState.error).toHaveBeenCalledWith("Failed to save draft.");
    expect(view.container.textContent).toContain("Failed to save draft.");

    // The publishing flag resets, so the toolbar offers Publish again.
    const publishButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Publish")
    );
    expect(publishButton?.textContent).not.toContain("Publishing...");
  } finally {
    view.cleanup();
  }
});

test("list items control renders the owner list-item shapes without scalar fallbacks", () => {
  const onChange = vi.fn();
  const view = mount(
    <ListItemsControl
      label="Items"
      value={["Docs", { label: "Privacy", href: "/privacy" }]}
      onChange={onChange}
    />
  );
  try {
    const rows = view.container.querySelectorAll("[data-page-editor-list-item-row]");
    expect(rows).toHaveLength(2);
    const labelInputs = Array.from(
      view.container.querySelectorAll('input[aria-label$="label"]')
    ) as HTMLInputElement[];
    const hrefInputs = Array.from(
      view.container.querySelectorAll('input[aria-label$="link URL"]')
    ) as HTMLInputElement[];
    expect(labelInputs.map((field) => field.value)).toEqual(["Docs", "Privacy"]);
    expect(hrefInputs.map((field) => field.value)).toEqual(["", "/privacy"]);

    // Commits keep the stored owner shapes: plain strings stay plain.
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      valueSetter?.call(labelInputs[0] as HTMLInputElement, "Documentation");
      (labelInputs[0] as HTMLInputElement).dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith([
      "Documentation",
      { label: "Privacy", href: "/privacy" },
    ]);
  } finally {
    view.cleanup();
  }
});
