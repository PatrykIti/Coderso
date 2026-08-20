// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  MediaUrlControl,
  type MediaUrlControlProps,
} from "../../../core/admin/ui/pages/editorControls/MediaUrlControl";

type MockMediaRecord = { id: string; url: string; type: string; mimeType: string };

const mediaMock = vi.hoisted(() => {
  const requests: Array<{
    resolve: (items: MockMediaRecord[]) => void;
    reject: (error: unknown) => void;
  }> = [];
  return {
    items: [] as MockMediaRecord[],
    requests,
    listMediaCached: vi.fn(
      () =>
        new Promise<MockMediaRecord[]>((resolve, reject) => {
          requests.push({ resolve, reject });
        })
    ),
    getCachedMedia: vi.fn(() => mediaMock.items),
    reset() {
      requests.length = 0;
      mediaMock.listMediaCached.mockClear();
      mediaMock.getCachedMedia.mockClear();
    },
  };
});

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: mediaMock.getCachedMedia,
  listMediaCached: mediaMock.listMediaCached,
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: (props: { value: unknown; onChange: (next: unknown) => void }) => (
    <div
      data-shared-media-picker="true"
      data-media-picker-value={props.value == null ? "" : String(props.value)}
    >
      {mediaMock.items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-media-picker-option={item.id}
          onClick={() => props.onChange(item.id)}
        >
          {item.id}
        </button>
      ))}
      <button type="button" data-media-picker-clear="true" onClick={() => props.onChange(null)}>
        Clear media
      </button>
    </div>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountControl = (props: MediaUrlControlProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<MediaUrlControl {...props} />);
  });
  return {
    container,
    rerender: (next: MediaUrlControlProps) => {
      React.act(() => {
        root.render(<MediaUrlControl {...next} />);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const click = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const pickerOption = (container: ParentNode, id: string) =>
  container.querySelector(`[data-media-picker-option="${id}"]`);

const pickerClear = (container: ParentNode) =>
  container.querySelector("[data-media-picker-clear]");

const readoutClear = (container: ParentNode) =>
  container.querySelector("[data-page-editor-media-external] button");

const readout = (container: ParentNode) =>
  container.querySelector("[data-page-editor-media-external]");

const resolveMedia = async (index: number, items: MockMediaRecord[]) => {
  await React.act(async () => {
    mediaMock.requests[index]?.resolve(items);
    await Promise.resolve();
    await Promise.resolve();
  });
};

const rejectMedia = async (index: number) => {
  await React.act(async () => {
    mediaMock.requests[index]?.reject(new Error("media list rejected"));
    await Promise.resolve();
    await Promise.resolve();
  });
};

const makeProps = (overrides: Partial<MediaUrlControlProps> = {}): MediaUrlControlProps => ({
  label: "Source",
  value: "",
  scopeKey: "scope-1",
  onChange: vi.fn(),
  ...overrides,
});

const asset = (id: string, url: string): MockMediaRecord => ({
  id,
  url,
  type: "image",
  mimeType: "image/jpeg",
});

beforeEach(() => {
  mediaMock.items = [];
  mediaMock.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("stored URL shows as the matching picker selection and mount emits nothing", () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ value: "/media/a.jpg", onChange }));
  try {
    const pickerValue = view.container.querySelector("[data-media-picker-value]");
    expect(pickerValue?.getAttribute("data-media-picker-value")).toBe("asset-1");
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("picker clear emits null, never an empty string", () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ value: "/media/a.jpg", onChange }));
  try {
    click(pickerClear(view.container));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  } finally {
    view.cleanup();
  }
});

test("selection resolves the matching MediaRecord url, never the asset id", async () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg"), asset("asset-2", "/media/b.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ onChange }));
  try {
    click(pickerOption(view.container, "asset-2"));
    await resolveMedia(0, mediaMock.items);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("/media/b.jpg");
  } finally {
    view.cleanup();
  }
});

test("same URL under two target scopes renders both selections and clears independently", () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChangeA = vi.fn();
  const onChangeB = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <div>
        <MediaUrlControl
          label="First"
          value="/media/a.jpg"
          scopeKey="scope-a"
          onChange={onChangeA}
        />
        <MediaUrlControl
          label="Second"
          value="/media/a.jpg"
          scopeKey="scope-b"
          onChange={onChangeB}
        />
      </div>
    );
  });
  try {
    const pickers = container.querySelectorAll("[data-shared-media-picker]");
    expect(pickers).toHaveLength(2);
    const values = container.querySelectorAll("[data-media-picker-value]");
    expect(values[0]?.getAttribute("data-media-picker-value")).toBe("asset-1");
    expect(values[1]?.getAttribute("data-media-picker-value")).toBe("asset-1");
    click(container.querySelectorAll("[data-media-picker-clear]")[1]);
    expect(onChangeA).not.toHaveBeenCalled();
    expect(onChangeB).toHaveBeenCalledTimes(1);
    expect(onChangeB).toHaveBeenCalledWith(null);
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("2048-character selection commits when maxLength is set", async () => {
  const url = "a".repeat(2048);
  mediaMock.items = [asset("asset-2048", url)];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ maxLength: 2048, onChange }));
  try {
    click(pickerOption(view.container, "asset-2048"));
    await resolveMedia(0, mediaMock.items);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(url);
  } finally {
    view.cleanup();
  }
});

test("2049-character selection emits nothing and never writes an asset id", async () => {
  const url = "a".repeat(2049);
  mediaMock.items = [asset("asset-2049", url)];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ maxLength: 2048, onChange }));
  try {
    click(pickerOption(view.container, "asset-2049"));
    await resolveMedia(0, mediaMock.items);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("over-limit stored value renders byte-for-byte and stays clearable", () => {
  const url = "a".repeat(2049);
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ value: url, maxLength: 2048, onChange }));
  try {
    const external = readout(view.container);
    expect(external).toBeTruthy();
    expect(external?.textContent?.includes(url)).toBe(true);
    click(readoutClear(view.container));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  } finally {
    view.cleanup();
  }
});

test("callback-target replacement invalidates a pending request (zero stale writes)", async () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChangeA = vi.fn();
  const onChangeB = vi.fn();
  const view = mountControl(makeProps({ onChange: onChangeA }));
  try {
    click(pickerOption(view.container, "asset-1"));
    view.rerender(makeProps({ onChange: onChangeB }));
    await resolveMedia(0, mediaMock.items);
    expect(onChangeA).not.toHaveBeenCalled();
    expect(onChangeB).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("clear before a pending resolution commits only the clear", async () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ onChange }));
  try {
    click(pickerOption(view.container, "asset-1"));
    click(pickerClear(view.container));
    await resolveMedia(0, mediaMock.items);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  } finally {
    view.cleanup();
  }
});

test("a newer selection invalidates the older pending resolution", async () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg"), asset("asset-2", "/media/b.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ onChange }));
  try {
    click(pickerOption(view.container, "asset-1"));
    click(pickerOption(view.container, "asset-2"));
    await resolveMedia(0, mediaMock.items);
    expect(onChange).not.toHaveBeenCalled();
    await resolveMedia(1, mediaMock.items);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("/media/b.jpg");
  } finally {
    view.cleanup();
  }
});

test("a rejected media-list request is non-mutating", async () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ onChange }));
  try {
    click(pickerOption(view.container, "asset-1"));
    await rejectMedia(0);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("an unmounted control whose pending request resolves later emits nothing", async () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ onChange }));
  click(pickerOption(view.container, "asset-1"));
  view.cleanup();
  await resolveMedia(0, mediaMock.items);
  expect(onChange).not.toHaveBeenCalled();
});

test("stored value with no matching asset surfaces as a clearable external readout", () => {
  mediaMock.items = [asset("asset-1", "/media/a.jpg")];
  const onChange = vi.fn();
  const view = mountControl(makeProps({ value: "/custom/external.jpg", onChange }));
  try {
    const external = readout(view.container);
    expect(external).toBeTruthy();
    expect(external?.textContent?.includes("/custom/external.jpg")).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
