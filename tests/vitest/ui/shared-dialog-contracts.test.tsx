// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { ConfirmActionDialog } from "../../../core/admin/ui/shared/ConfirmActionDialog";
import { ExportDialog } from "../../../core/admin/ui/shared/ExportDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
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
  return button;
};

const setInputValue = async (input: HTMLInputElement, value: string) => {
  await React.act(async () => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
  });
};

test("ConfirmActionDialog keeps cancel side-effect free and submits once", async () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  const view = mount(
    <ConfirmActionDialog
      open
      title="Delete record?"
      description="This cannot be undone."
      confirmLabel="Delete"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );

  try {
    expect(document.body.textContent).toContain("Delete record?");
    expect(document.body.textContent).toContain("This cannot be undone.");

    await clickButton("Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();

    await clickButton("Delete");
    expect(onConfirm).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("ConfirmActionDialog restores focus to the opener after cancel", async () => {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.textContent = "Open risky action";
  document.body.appendChild(trigger);
  trigger.focus();

  function StatefulConfirm() {
    const [open, setOpen] = React.useState(true);
    return (
      <ConfirmActionDialog
        open={open}
        title="Delete record?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onOpenChange={setOpen}
        onConfirm={() => undefined}
      />
    );
  }

  const view = mount(<StatefulConfirm />);

  try {
    await clickButton("Cancel");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  } finally {
    view.cleanup();
  }
});

test("ConfirmActionDialog blocks typed confirmations until the value matches", async () => {
  const onConfirm = vi.fn();
  const view = mount(
    <ConfirmActionDialog
      open
      title="Grant full access?"
      description="This grants every permission."
      confirmLabel="Grant access"
      requireTypedValue="GRANT"
      onOpenChange={() => undefined}
      onConfirm={onConfirm}
      tone="warning"
    />
  );

  try {
    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Grant access")
    ) as HTMLButtonElement | undefined;
    expect(confirmButton?.disabled).toBe(true);

    const input = document.body.querySelector("input");
    if (!input) throw new Error("Missing typed confirmation input");
    await setInputValue(input, "GRANT");

    expect(confirmButton?.disabled).toBe(false);
    await clickButton("Grant access");
    expect(onConfirm).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("ConfirmActionDialog keeps the dialog open with retry-capable error copy", async () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn().mockRejectedValueOnce(new Error("Delete failed"));
  const view = mount(
    <ConfirmActionDialog
      open
      title="Delete record?"
      description="This cannot be undone."
      confirmLabel="Delete"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );

  try {
    await clickButton("Delete");
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(document.body.textContent).toContain("Delete failed");
  } finally {
    view.cleanup();
  }
});

test("ExportDialog submits selected fields and removes unsupported Excel export", async () => {
  const onExport = vi.fn().mockResolvedValue(undefined);
  const view = mount(
    <ExportDialog
      open
      onOpenChange={() => undefined}
      title="Export Audit Logs"
      description="Download records."
      filename="audit-logs.{format}"
      fields={[
        { id: "event", label: "Event", defaultChecked: true },
        { id: "actor", label: "Actor", defaultChecked: false },
      ]}
      onExport={onExport}
    />
  );

  try {
    expect(document.body.textContent).toContain("Export Audit Logs");
    expect(document.body.textContent).not.toContain("Excel");
    expect(document.body.textContent).toContain("audit-logs.csv");
    await clickButton("Export");
    expect(onExport).toHaveBeenCalledWith({ format: "csv", fields: ["event"] });
    expect(document.body.textContent).toContain("Export started.");
  } finally {
    view.cleanup();
  }
});

test("ExportDialog disables unsupported and empty-field submissions", async () => {
  const view = mount(
    <ExportDialog
      open
      onOpenChange={() => undefined}
      title="Export Access Logs"
      description="Download records."
      filename="access-logs.csv"
      fields={[{ id: "ip", label: "IP address", defaultChecked: false }]}
      unavailableReason="Access log export is not wired yet."
    />
  );

  try {
    expect(document.body.textContent).toContain("Access log export is not wired yet.");
    const exportButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Export")
    ) as HTMLButtonElement | undefined;
    expect(exportButton?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("ExportDialog keeps failed exports open for retry", async () => {
  const onExport = vi
    .fn()
    .mockRejectedValueOnce(new Error("Export failed"))
    .mockResolvedValueOnce(undefined);
  const view = mount(
    <ExportDialog
      open
      onOpenChange={() => undefined}
      title="Export Logs"
      description="Download records."
      filename="logs.csv"
      fields={[{ id: "event", label: "Event", defaultChecked: true }]}
      onExport={onExport}
    />
  );

  try {
    await clickButton("Export");
    expect(document.body.textContent).toContain("Export failed");
    await clickButton("Export");
    expect(onExport).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("Export started.");
  } finally {
    view.cleanup();
  }
});
