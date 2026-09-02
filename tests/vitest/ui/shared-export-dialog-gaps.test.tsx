// @vitest-environment happy-dom
//
// TASK-105-08-09 (L09) shared-a: behavioral gap coverage for `shared/ExportDialog`.
// Sibling suites already cover the happy path (CSV submit, unavailable banner,
// retry after failure); this suite pins the remaining branches: format switching,
// field add/remove bookkeeping, mid-submit dismissal guard, reset-on-close, the
// generic fallback copy for non-Error rejections, and the default unavailable
// state when no exporter is wired.
//
// Radix Select/Checkbox are mocked as native controls (repo idiom, see
// `access-logs.test.tsx` / `backups-dialogs-branches.test.tsx`) so interactions run
// through real DOM events while the dialog itself stays real.

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import {
  ExportDialog,
  type ExportField,
  type ExportDialogPayload,
} from "../../../core/admin/ui/shared/ExportDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }) => (
    <select
      value={value}
      disabled={disabled}
      data-testid="export-format"
      onChange={(event) => onValueChange(event.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// A button-based checkbox keeps the harness independent of happy-dom's label
// forwarding quirks around native inputs; deriving the next value from the
// current prop keeps repeated activations idempotent.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked === true}
      disabled={disabled}
      data-testid="export-field"
      onClick={() => onCheckedChange?.(!(checked === true))}
    />
  ),
}));

type Deferred = { promise: Promise<void>; resolve: () => void };

const defer = (): Deferred => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const mountDialog = (
  props: Partial<React.ComponentProps<typeof ExportDialog>> &
    Pick<React.ComponentProps<typeof ExportDialog>, "fields">
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <ExportDialog
        open
        onOpenChange={() => undefined}
        title="Export Records"
        description="Download the current view."
        filename="records.{format}"
        {...props}
      />
    );
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
      document.body.innerHTML = "";
    },
  };
};

const clickButton = async (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`Missing button ${label}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
  return button as HTMLButtonElement;
};

const chooseFormat = async (format: string) => {
  const select = document.body.querySelector<HTMLSelectElement>(
    "select[data-testid='export-format']"
  );
  if (!select) throw new Error("Missing format select");
  await React.act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, format);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
};

const toggleField = async (index: number) => {
  const boxes = document.body.querySelectorAll<HTMLButtonElement>(
    "button[data-testid='export-field']"
  );
  const box = boxes[index];
  if (!box) throw new Error(`Missing field checkbox ${index}`);
  await React.act(async () => {
    box.click();
    await Promise.resolve();
  });
};

const bodyText = () => document.body.textContent ?? "";

test("switching format to JSON retargets the filename preview and the export payload", async () => {
  const payloads: ExportDialogPayload[] = [];
  const view = mountDialog({
    filename: "users-export.{format}",
    fields: [
      { id: "id", label: "ID", defaultChecked: true },
      // Only an explicit `false` opts a field out of the initial selection.
      { id: "email", label: "Email", defaultChecked: false },
    ],
    onExport: (payload) => {
      payloads.push(payload);
    },
  });

  try {
    expect(bodyText()).toContain("users-export.csv");

    await chooseFormat("json");
    // Visible effect: the previewed file name follows the selected format.
    expect(bodyText()).toContain("users-export.json");

    // Adding a previously unchecked field must land in the submitted payload.
    await toggleField(1);
    await clickButton("Export");

    expect(payloads).toEqual([{ format: "json", fields: ["id", "email"] }]);
    expect(bodyText()).toContain("Export started.");
  } finally {
    view.cleanup();
  }
});

test("unchecking a field drops it from the payload and clears stale error copy", async () => {
  const onExport = vi
    .fn<(payload: ExportDialogPayload) => Promise<void>>()
    .mockRejectedValueOnce(new Error("disk full"))
    .mockResolvedValueOnce(undefined);
  const fields: ExportField[] = [
    { id: "actor", label: "Actor", defaultChecked: true },
    { id: "target", label: "Target", defaultChecked: true },
  ];
  const view = mountDialog({ fields, onExport });

  try {
    await clickButton("Export");
    expect(bodyText()).toContain("disk full");

    // Interacting with the checklist clears the stale error before the retry.
    await toggleField(1);
    expect(bodyText()).not.toContain("disk full");

    await clickButton("Export");
    expect(onExport).toHaveBeenLastCalledWith({ format: "csv", fields: ["actor"] });
    expect(bodyText()).toContain("Export started.");
  } finally {
    view.cleanup();
  }
});

test("dismissals are blocked mid-submit; closing afterwards resets the dialog state", async () => {
  const onOpenChange = vi.fn();
  const gate = defer();
  const view = mountDialog({
    filename: "audit-{format}",
    fields: [{ id: "event", label: "Event", defaultChecked: true }],
    onOpenChange,
    onExport: () => gate.promise,
  });

  try {
    await chooseFormat("json");
    await clickButton("Export");
    expect(bodyText()).toContain("Exporting...");

    // Radix dismiss paths (Escape / outside press) funnel through the guarded
    // handler: an Escape mid-submit must NOT close or report the dialog closed.
    await React.act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await Promise.resolve();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(bodyText()).toContain("Exporting...");

    gate.resolve();
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(bodyText()).toContain("Export started.");

    // Closing after completion reports false and resets format/message state, so
    // the still-mounted dialog is back to its defaults (CSV preview, no banner).
    await clickButton("Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.body.querySelector<HTMLSelectElement>("select")?.value).toBe("csv");
    expect(bodyText()).toContain("audit-csv");
    expect(bodyText()).not.toContain("audit-json");
    expect(bodyText()).not.toContain("Export started.");
  } finally {
    view.cleanup();
  }
});

test("non-Error rejections get calm retry guidance instead of '[object]'-style noise", async () => {
  const onExport = vi
    .fn<(payload: ExportDialogPayload) => Promise<void>>()
    .mockRejectedValueOnce("network dropped")
    .mockRejectedValueOnce(new Error("   "))
    .mockResolvedValueOnce(undefined);
  const view = mountDialog({
    fields: [{ id: "event", label: "Event", defaultChecked: true }],
    onExport,
  });

  try {
    await clickButton("Export");
    expect(bodyText()).toContain("Export failed. Review the issue and try again.");

    // Blank messages are treated like missing ones: same fallback copy.
    await clickButton("Export");
    expect(bodyText()).toContain("Export failed. Review the issue and try again.");

    await clickButton("Export");
    expect(onExport).toHaveBeenCalledTimes(3);
    expect(bodyText()).toContain("Export started.");
  } finally {
    view.cleanup();
  }
});

test("unchecking every field disables Export even with an exporter wired", async () => {
  const onExport = vi.fn<(payload: ExportDialogPayload) => Promise<void>>();
  const view = mountDialog({
    fields: [{ id: "event", label: "Event", defaultChecked: true }],
    onExport,
  });

  try {
    const exportButton = () =>
      Array.from(document.body.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Export")
      );
    expect(exportButton()?.disabled).toBe(false);

    await toggleField(0);
    // With no fields selected the submit guard makes the button inert, so the
    // empty-selection branch inside handleSubmit (ExportDialog.tsx:107-110) is
    // unreachable from the UI. handleSubmit is invoked only from the Export
    // button's onClick (ExportDialog.tsx:190), whose disabled prop is
    // !canSubmit || isSubmitting with canSubmit = Boolean(onExport) &&
    // !unavailableCopy && selectedFields.length > 0 (ExportDialog.tsx:79,191).
    // A length-0 selection therefore forces the button disabled, and disabled
    // buttons suppress click entirely (happy-dom HTMLButtonElement.dispatchEvent
    // returns false for clicks on disabled controls). The only code path that
    // shrinks selectedFields is handleFieldChange (96-103), which re-renders the
    // button disabled before any subsequent click can fire; during submit the
    // checkboxes are themselves disabled (161), so no mid-submit shrink exists.
    expect(exportButton()?.disabled).toBe(true);
    expect(onExport).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("without an exporter the dialog shows the default unavailable copy and locks the controls", async () => {
  const onOpenChange = vi.fn();
  const view = mountDialog({
    fields: [{ id: "ip", label: "IP address", defaultChecked: false }],
    onOpenChange,
  });

  try {
    expect(bodyText()).toContain("Export is not available for this surface yet.");

    const select = document.body.querySelector<HTMLSelectElement>(
      "select[data-testid='export-format']"
    );
    expect(select?.disabled).toBe(true);

    const box = document.body.querySelector<HTMLButtonElement>(
      "button[data-testid='export-field']"
    );
    expect(box?.disabled).toBe(true);
    expect(box?.getAttribute("aria-checked")).toBe("false");

    const exportButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Export")
    );
    expect(exportButton?.disabled).toBe(true);

    // Cancel stays available and still reports the close through onOpenChange.
    await clickButton("Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});
