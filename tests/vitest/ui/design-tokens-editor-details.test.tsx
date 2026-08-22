// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { DesignTokensEditor } from "../../../core/admin/ui/settings/DesignTokensEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

const pageText = () => document.body.textContent ?? "";

function editorTextarea() {
  const textarea = document.body.querySelector<HTMLTextAreaElement>("textarea");
  if (!textarea) throw new Error("missing textarea");
  return textarea;
}

function setEditorValue(value: string) {
  const textarea = editorTextarea();
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clickByText(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${text}`);
  }
  act(() => {
    button.click();
  });
}

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("DesignTokensEditor shows the valid badge, line numbers, and serialized value", () => {
  const view = mount(
    <DesignTokensEditor
      value={{ colors: { primary: "#1392ec" } }}
      onChange={() => undefined}
      onReset={() => undefined}
    />
  );
  try {
    expect(pageText()).toContain("Valid");
    expect(pageText()).toContain('"primary": "#1392ec"');
    expect(editorTextarea().value).toContain('"primary": "#1392ec"');
  } finally {
    view.cleanup();
  }
});

test("DesignTokensEditor streams parsed JSON to onChange while typing", async () => {
  const onChange = vi.fn();
  const view = mount(
    <DesignTokensEditor value={{}} onChange={onChange} onReset={() => undefined} />
  );
  try {
    setEditorValue('{"spacing": {"unit": "8px"}}');
    await flush();
    expect(onChange).toHaveBeenLastCalledWith({ spacing: { unit: "8px" } });
    expect(pageText()).toContain("Valid");
  } finally {
    view.cleanup();
  }
});

test("DesignTokensEditor keeps an invalid draft and disables Apply", async () => {
  const onChange = vi.fn();
  const view = mount(
    <DesignTokensEditor value={{}} onChange={onChange} onReset={() => undefined} />
  );
  try {
    setEditorValue("{ nope");
    await flush();
    expect(pageText()).toContain("Invalid");
    expect(pageText()).toContain("Invalid JSON");
    expect(onChange).not.toHaveBeenCalled();

    const applyButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Apply tokens"
    );
    expect((applyButton as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("DesignTokensEditor applies a valid draft and resets the draft", async () => {
  const onChange = vi.fn();
  const view = mount(
    <DesignTokensEditor
      value={{ colors: { primary: "#000000" } }}
      onChange={onChange}
      onReset={() => undefined}
    />
  );
  try {
    setEditorValue('{"radius": {"sm": "4px"}}');
    await flush();
    clickByText("Apply tokens");
    await flush();

    expect(onChange).toHaveBeenLastCalledWith({ radius: { sm: "4px" } });
    expect(editorTextarea().value).toContain('"primary": "#000000"');
    expect(pageText()).toContain("Valid");
  } finally {
    view.cleanup();
  }
});

test("DesignTokensEditor resets through the footer button and clears the draft", async () => {
  const onReset = vi.fn();
  const view = mount(
    <DesignTokensEditor
      value={{ colors: { primary: "#000000" } }}
      onChange={() => undefined}
      onReset={onReset}
    />
  );
  try {
    setEditorValue('{"colors": {"primary": "#ff0000"}}');
    await flush();
    clickByText("Reset defaults");
    await flush();

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(editorTextarea().value).toContain('"primary": "#000000"');
  } finally {
    view.cleanup();
  }
});

test("DesignTokensEditor mounts with an initial draft", () => {
  const view = mount(
    <DesignTokensEditor
      value={{}}
      initialDraft='{"colors": {"primary": "#00ff00"}}'
      onChange={() => undefined}
      onReset={() => undefined}
    />
  );
  try {
    expect(editorTextarea().value).toContain('"primary": "#00ff00"');
    expect(pageText()).toContain("Valid");
  } finally {
    view.cleanup();
  }
});
