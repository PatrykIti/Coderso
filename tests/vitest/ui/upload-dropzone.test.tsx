// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  UploadDropzone,
  type UploadDropzoneHandle,
} from "../../../core/admin/ui/media/UploadDropzone";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
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

const createTransfer = (names: string[]) => {
  const transfer = new DataTransfer();
  for (const name of names) {
    transfer.items.add(new File(["content"], name, { type: "text/plain" }));
  }
  return transfer;
};

const getFileInput = (container: ParentNode) => {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("Expected file input");
  return input;
};

const getDropZone = (container: ParentNode) => {
  const dropZone = Array.from(container.querySelectorAll("div")).find((div) =>
    div.className.includes("border-dashed")
  );
  if (!(dropZone instanceof HTMLDivElement)) throw new Error("Expected upload drop zone");
  return dropZone;
};

const setInputFiles = (input: HTMLInputElement, transfer: DataTransfer | null) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
  if (!descriptor?.set) throw new Error("Expected file input files setter");
  descriptor.set.call(input, transfer?.files ?? null);
};

const dispatchDrop = (dropZone: HTMLElement, transfer: DataTransfer) => {
  const event = new DragEvent("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    configurable: true,
    value: transfer,
  });
  dropZone.dispatchEvent(event);
};

test("UploadDropzone panel renders the drop area and fires onFiles from the file input", () => {
  const receivedFileNames: string[][] = [];
  const onFiles = vi.fn((files: File[]) => {
    receivedFileNames.push(files.map((file) => file.name));
  });
  const container = mount(<UploadDropzone onFiles={onFiles} />);
  expect(container.textContent).toContain("Drag and drop files here");
  const input = getFileInput(container);
  const transfer = createTransfer(["a.png", "b.png"]);
  React.act(() => {
    setInputFiles(input, transfer);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onFiles).toHaveBeenCalledTimes(1);
  expect(receivedFileNames).toEqual([["a.png", "b.png"]]);
});

test("UploadDropzone drops files onto the panel and fires onFiles", () => {
  const onFiles = vi.fn();
  const container = mount(<UploadDropzone onFiles={onFiles} />);
  const dropZone = getDropZone(container);
  React.act(() => {
    dropZone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
  });
  expect(dropZone.className).toContain("border-primary");
  const transfer = createTransfer(["drop.png"]);
  React.act(() => {
    dispatchDrop(dropZone, transfer);
  });
  expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "drop.png" })]);
  // Drag state resets after drop.
  expect(dropZone.className).not.toContain("border-primary");
});

test("UploadDropzone ignores drops while disabled and renders the error text", () => {
  const onFiles = vi.fn();
  const container = mount(<UploadDropzone onFiles={onFiles} disabled error="Upload failed" />);
  expect(container.textContent).toContain("Upload failed");
  const dropZone = getDropZone(container);
  const transfer = createTransfer(["blocked.png"]);
  React.act(() => {
    dispatchDrop(dropZone, transfer);
  });
  expect(onFiles).not.toHaveBeenCalled();
});

test("UploadDropzone headless variant exposes openFileDialog and hides the drop area", () => {
  const onFiles = vi.fn();
  const ref = React.createRef<UploadDropzoneHandle>();
  const container = mount(<UploadDropzone ref={ref} onFiles={onFiles} variant="headless" />);
  expect(container.textContent).not.toContain("Drag and drop files here");
  const input = getFileInput(container);
  const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
  React.act(() => {
    ref.current?.openFileDialog();
  });
  expect(clickSpy).toHaveBeenCalledTimes(1);
});

test("UploadDropzone ignores an empty file selection", () => {
  const onFiles = vi.fn();
  const container = mount(<UploadDropzone onFiles={onFiles} />);
  const input = getFileInput(container);
  React.act(() => {
    setInputFiles(input, null);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onFiles).not.toHaveBeenCalled();
});

test("UploadDropzone resets drag state on drag leave and opens the dialog from Browse", () => {
  const onFiles = vi.fn();
  const container = mount(<UploadDropzone onFiles={onFiles} />);
  const dropZone = getDropZone(container);
  React.act(() => {
    dropZone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
  });
  expect(dropZone.className).toContain("border-primary");
  React.act(() => {
    dropZone.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
  });
  expect(dropZone.className).not.toContain("border-primary");

  const input = getFileInput(container);
  const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
  const browse = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Browse Files")
  );
  if (!(browse instanceof HTMLButtonElement)) throw new Error("Expected Browse Files button");
  React.act(() => {
    browse.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(clickSpy).toHaveBeenCalledTimes(1);
});
