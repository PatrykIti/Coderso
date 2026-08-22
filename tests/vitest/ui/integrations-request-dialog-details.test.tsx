// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { IntegrationRequestDialog } from "../../../core/admin/ui/settings/IntegrationRequestDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="request-dialog" data-open={String(open)}>
      <button type="button" data-testid="dialog-toggle" onClick={() => onOpenChange(!open)}>
        dialog-toggle
      </button>
      {open ? children : null}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

type SubmittedPayload = { name: string; website?: string | null; notes?: string | null };

function Harness({
  onSubmitted,
  error,
  isSubmitting = false,
}: {
  onSubmitted: (payload: SubmittedPayload) => void;
  error?: string | null;
  isSubmitting?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <IntegrationRequestDialog
      open={open}
      onOpenChange={setOpen}
      onSubmit={onSubmitted}
      error={error}
      isSubmitting={isSubmitting}
    />
  );
}

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => React.act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  React.act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

const pageText = () => document.body.textContent ?? "";

async function clickButton(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
}

async function toggleDialog() {
  const dialog = document.body.querySelector<HTMLElement>('[data-testid="request-dialog"]');
  if (!dialog) throw new Error("missing request dialog");
  const toggle = dialog.querySelector<HTMLButtonElement>('[data-testid="dialog-toggle"]');
  if (!toggle) throw new Error("missing dialog toggle");
  await React.act(async () => {
    toggle.click();
    await Promise.resolve();
  });
}

function inputByPlaceholder(placeholder: string) {
  const input = Array.from(document.body.querySelectorAll("input")).find(
    (item) => item.getAttribute("placeholder") === placeholder
  );
  if (!(input instanceof HTMLInputElement)) throw new Error(`missing input: ${placeholder}`);
  return input;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("IntegrationRequestDialog opens through the dialog callback and clears the local error", async () => {
  const onSubmitted = vi.fn();
  const view = mount(<Harness onSubmitted={onSubmitted} />);
  try {
    await toggleDialog();
    expect(pageText()).toContain("Request New Integration");

    await clickButton("Submit Request");
    expect(pageText()).toContain("Please provide a service name.");
    expect(onSubmitted).not.toHaveBeenCalled();

    await toggleDialog();
    await flush();
    await toggleDialog();
    await flush();
    expect(pageText()).not.toContain("Please provide a service name.");
    expect(pageText()).toContain("Request New Integration");
  } finally {
    view.cleanup();
  }
});

test("IntegrationRequestDialog closes through the header close button", async () => {
  const onSubmitted = vi.fn();
  const view = mount(<Harness onSubmitted={onSubmitted} />);
  try {
    await toggleDialog();
    expect(pageText()).toContain("Request New Integration");

    const closeButton = Array.from(document.body.querySelectorAll("button")).find(
      (item) => item.getAttribute("aria-label") === "Close integration request dialog"
    );
    if (!(closeButton instanceof HTMLButtonElement)) throw new Error("missing close button");
    await React.act(async () => {
      closeButton.click();
      await Promise.resolve();
    });
    expect(pageText()).not.toContain("Request New Integration");
  } finally {
    view.cleanup();
  }
});

test("IntegrationRequestDialog submits trimmed fields and shows the submitting label", async () => {
  const onSubmitted = vi.fn();
  const view = mount(<Harness onSubmitted={onSubmitted} isSubmitting />);
  try {
    await toggleDialog();
    expect(pageText()).toContain("Submitting...");
    const submit = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Submitting...")
    );
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("IntegrationRequestDialog types notes and cancels through the footer button", async () => {
  const onSubmitted = vi.fn();
  const view = mount(<Harness onSubmitted={onSubmitted} />);
  try {
    await toggleDialog();
    const notes = document.body.querySelector<HTMLTextAreaElement>("textarea");
    if (!notes) throw new Error("missing notes textarea");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(notes, "Webhooks and data sync");
      notes.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(notes.value).toBe("Webhooks and data sync");
    await clickButton("Cancel");
    expect(pageText()).not.toContain("Request New Integration");
    expect(onSubmitted).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("IntegrationRequestDialog submits website and notes alongside the name", async () => {
  const onSubmitted = vi.fn();
  const view = mount(<Harness onSubmitted={onSubmitted} />);
  try {
    await toggleDialog();
    setInputValue(inputByPlaceholder("e.g. HubSpot"), " HubSpot ");
    setInputValue(inputByPlaceholder("https://..."), "https://hubspot.com");
    const notes = document.body.querySelector<HTMLTextAreaElement>("textarea");
    if (!notes) throw new Error("missing notes textarea");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(notes, "  sync events  ");
      notes.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await clickButton("Submit Request");
    expect(onSubmitted).toHaveBeenCalledWith({
      name: "HubSpot",
      website: "https://hubspot.com",
      notes: "sync events",
    });
  } finally {
    view.cleanup();
  }
});

test("IntegrationRequestDialog displays the server-provided error", async () => {
  const onSubmitted = vi.fn();
  const view = mount(<Harness onSubmitted={onSubmitted} error="request_blocked" />);
  try {
    await toggleDialog();
    expect(pageText()).toContain("request_blocked");
  } finally {
    view.cleanup();
  }
});
