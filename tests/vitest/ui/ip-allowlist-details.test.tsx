// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  IpAllowlistDrawer,
  IpAllowlistDrawerPanel,
} from "../../../core/admin/ui/settings/IpAllowlistDrawer";
import { useIpAllowlist } from "../../../core/admin/ui/settings/useIpAllowlist";

type IpAllowlistEntryFixture = {
  id: string;
  cidr: string;
  label: string | null;
  description: string | null;
  createdAt: string;
};

type ListAllowlistMock = () => Promise<IpAllowlistEntryFixture[]>;
type AddAllowlistMock = (payload: {
  cidr: string;
  label?: string;
  description?: string;
}) => Promise<{ ok: boolean }>;
type RemoveAllowlistMock = (id: string) => Promise<{ ok: boolean }>;

const ipState = vi.hoisted(() => {
  const entry: IpAllowlistEntryFixture = {
    id: "allow-1",
    cidr: "198.51.100.0/24",
    label: "Office",
    description: "Office network",
    createdAt: "2026-06-01T10:00:00.000Z",
  };
  const state = {
    entries: [entry],
    listIpAllowlist: vi.fn<ListAllowlistMock>(),
    addIpAllowlistEntry: vi.fn<AddAllowlistMock>(),
    removeIpAllowlistEntry: vi.fn<RemoveAllowlistMock>(),
    reset() {
      state.listIpAllowlist.mockReset();
      state.addIpAllowlistEntry.mockReset();
      state.removeIpAllowlistEntry.mockReset();
      state.listIpAllowlist.mockImplementation(async () => state.entries);
      state.addIpAllowlistEntry.mockResolvedValue({ ok: true });
      state.removeIpAllowlistEntry.mockResolvedValue({ ok: true });
    },
  };
  return state;
});

vi.mock("@/services/ipAllowlistClient", () => ({
  addIpAllowlistEntry: ipState.addIpAllowlistEntry,
  listIpAllowlist: ipState.listIpAllowlist,
  removeIpAllowlistEntry: ipState.removeIpAllowlistEntry,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "message" in error),
}));

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

function setInputValue(selector: string, value: string) {
  const input = document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) throw new Error(`Missing input ${selector}`);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value"
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const pageText = () => document.body.textContent ?? "";

const submitSync = () => {
  clickByText("Add to Allowlist");
};

const apiError = (message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
};

beforeEach(() => {
  ipState.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

function IpAllowlistHarness() {
  const { entries, isLoading, error, addEntry, removeEntry } = useIpAllowlist();
  return (
    <div>
      <span data-testid="allowlist-count">{entries.length}</span>
      <span data-testid="allowlist-loading">{String(isLoading)}</span>
      <span data-testid="allowlist-error">{error ?? "none"}</span>
      {entries.map((entry) => (
        <span key={entry.id} data-testid={`allowlist-cidr-${entry.id}`}>
          {entry.cidr}
        </span>
      ))}
      <button
        type="button"
        onClick={() => {
          void addEntry({ cidr: "10.0.0.0/8", label: "New" }).catch(() => undefined);
        }}
      >
        add-entry
      </button>
      <button
        type="button"
        onClick={() => {
          void removeEntry("allow-1").catch(() => undefined);
        }}
      >
        remove-entry
      </button>
    </div>
  );
}

const count = () => document.body.querySelector('[data-testid="allowlist-count"]')?.textContent;
const loading = () => document.body.querySelector('[data-testid="allowlist-loading"]')?.textContent;
const hookError = () => document.body.querySelector('[data-testid="allowlist-error"]')?.textContent;

test("useIpAllowlist loads entries on mount", async () => {
  const view = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    expect(count()).toBe("1");
    expect(loading()).toBe("false");
    expect(document.body.textContent).toContain("198.51.100.0/24");
  } finally {
    view.cleanup();
  }
});

test("useIpAllowlist surfaces load errors from the endpoint and generic fallback", async () => {
  ipState.listIpAllowlist.mockRejectedValueOnce(apiError("listing denied"));
  const first = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    expect(hookError()).toBe("listing denied");
  } finally {
    first.cleanup();
  }

  ipState.listIpAllowlist.mockRejectedValueOnce({ code: "boom" });
  const second = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    expect(hookError()).toBe("Failed to load IP allowlist.");
  } finally {
    second.cleanup();
  }
});

test("useIpAllowlist adds an entry and refreshes the list", async () => {
  const view = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    ipState.listIpAllowlist.mockClear();
    clickByText("add-entry");
    await flush();
    await flush();

    expect(ipState.addIpAllowlistEntry).toHaveBeenCalledWith({
      cidr: "10.0.0.0/8",
      label: "New",
    });
    expect(ipState.listIpAllowlist).toHaveBeenCalledTimes(1);
    expect(hookError()).toBe("none");
  } finally {
    view.cleanup();
  }
});

test("useIpAllowlist surfaces add errors and rethrows", async () => {
  ipState.addIpAllowlistEntry.mockRejectedValueOnce(apiError("add denied"));
  const first = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    clickByText("add-entry");
    await flush();
    await flush();
    expect(hookError()).toBe("add denied");
  } finally {
    first.cleanup();
  }

  ipState.addIpAllowlistEntry.mockRejectedValueOnce({ code: "boom" });
  const second = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    clickByText("add-entry");
    await flush();
    await flush();
    expect(hookError()).toBe("Failed to add IP range.");
  } finally {
    second.cleanup();
  }
});

test("useIpAllowlist removes an entry and refreshes the list", async () => {
  const view = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    ipState.listIpAllowlist.mockClear();
    clickByText("remove-entry");
    await flush();
    await flush();

    expect(ipState.removeIpAllowlistEntry).toHaveBeenCalledWith("allow-1");
    expect(ipState.listIpAllowlist).toHaveBeenCalledTimes(1);
    expect(hookError()).toBe("none");
  } finally {
    view.cleanup();
  }
});

test("useIpAllowlist surfaces remove errors and rethrows", async () => {
  ipState.removeIpAllowlistEntry.mockRejectedValueOnce(apiError("remove denied"));
  const first = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    clickByText("remove-entry");
    await flush();
    await flush();
    expect(hookError()).toBe("remove denied");
  } finally {
    first.cleanup();
  }

  ipState.removeIpAllowlistEntry.mockRejectedValueOnce({ code: "boom" });
  const second = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    clickByText("remove-entry");
    await flush();
    await flush();
    expect(hookError()).toBe("Failed to remove IP range.");
  } finally {
    second.cleanup();
  }
});

test("useIpAllowlist refresh failures after a mutation surface an error", async () => {
  const first = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    ipState.listIpAllowlist.mockRejectedValueOnce(apiError("refresh failed"));
    clickByText("add-entry");
    await flush();
    await flush();
    expect(hookError()).toBe("refresh failed");
  } finally {
    first.cleanup();
  }

  const second = mount(<IpAllowlistHarness />);
  try {
    await flush();
    await flush();
    ipState.listIpAllowlist.mockRejectedValueOnce({ code: "boom" });
    clickByText("add-entry");
    await flush();
    await flush();
    expect(hookError()).toBe("Failed to load IP allowlist.");
  } finally {
    second.cleanup();
  }
});

test("IpAllowlistDrawerPanel validates the CIDR before submitting", () => {
  const onSubmit = vi.fn();
  const view = mount(<IpAllowlistDrawerPanel onSubmit={onSubmit} />);
  try {
    submitSync();
    expect(pageText()).toContain("CIDR is required.");
    expect(onSubmit).not.toHaveBeenCalled();

    setInputValue('input[placeholder="0.0.0.0/0"]', "203.0.113.0/24");
    submitSync();
    expect(pageText()).not.toContain("CIDR is required.");
    expect(onSubmit).toHaveBeenCalledWith({
      cidr: "203.0.113.0/24",
      label: undefined,
      description: undefined,
    });
  } finally {
    view.cleanup();
  }
});

test("IpAllowlistDrawerPanel submits label and description and clears errors on typing", () => {
  const onSubmit = vi.fn();
  const view = mount(<IpAllowlistDrawerPanel onSubmit={onSubmit} />);
  try {
    submitSync();
    expect(pageText()).toContain("CIDR is required.");

    setInputValue('input[placeholder="e.g. London Office"]', "  London office  ");
    expect(pageText()).not.toContain("CIDR is required.");

    submitSync();
    expect(pageText()).toContain("CIDR is required.");
    setInputValue("textarea", "Internal network");
    expect(pageText()).not.toContain("CIDR is required.");

    setInputValue('input[placeholder="0.0.0.0/0"]', "10.0.0.0/8");
    setInputValue("textarea", "Internal network");
    submitSync();
    expect(onSubmit).toHaveBeenCalledWith({
      cidr: "10.0.0.0/8",
      label: "London office",
      description: "Internal network",
    });
  } finally {
    view.cleanup();
  }
});

test("IpAllowlistDrawerPanel honors readOnly mode", () => {
  const onSubmit = vi.fn();
  const view = mount(<IpAllowlistDrawerPanel readOnly onSubmit={onSubmit} />);
  try {
    const cidrInput = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="0.0.0.0/0"]'
    );
    expect(cidrInput?.disabled).toBe(true);
    clickByText("Add to Allowlist");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(pageText()).not.toContain("CIDR is required.");
  } finally {
    view.cleanup();
  }
});

test("IpAllowlistDrawerPanel renders a supplied error and its informational copy", () => {
  const view = mount(<IpAllowlistDrawerPanel error="endpoint rejected" />);
  try {
    expect(pageText()).toContain("endpoint rejected");
    expect(pageText()).toContain("Add New IP Range");
    expect(pageText()).toContain("Restrict admin access by CIDR.");
    expect(pageText()).toContain("Security Note");
    expect(pageText()).toContain("Allowing wide ranges");
  } finally {
    view.cleanup();
  }
});

test("IpAllowlistDrawer opens, submits, and closes through the real sheet", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const view = mount(
    <IpAllowlistDrawer trigger={<button type="button">Open drawer</button>} onSubmit={onSubmit} />
  );
  try {
    clickByText("Open drawer");
    await flush();
    expect(pageText()).toContain("Add New IP Range");

    setInputValue('input[placeholder="e.g. London Office"]', "Vault");
    setInputValue('input[placeholder="0.0.0.0/0"]', "192.168.1.1");
    clickByText("Add to Allowlist");
    await flush();
    await flush();

    expect(onSubmit).toHaveBeenCalledWith({
      cidr: "192.168.1.1",
      label: "Vault",
      description: undefined,
    });
    expect(pageText()).not.toContain("Add New IP Range");
  } finally {
    view.cleanup();
  }
});

test("IpAllowlistDrawer keeps the sheet open when submission fails", async () => {
  const onSubmit = vi.fn().mockRejectedValue(apiError("add denied"));
  const view = mount(<IpAllowlistDrawer defaultOpen onSubmit={onSubmit} error={null} />);
  try {
    await flush();
    expect(pageText()).toContain("Add New IP Range");

    setInputValue('input[placeholder="0.0.0.0/0"]', "203.0.113.5");
    clickByText("Add to Allowlist");
    await flush();
    await flush();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(pageText()).toContain("Add New IP Range");
  } finally {
    view.cleanup();
  }
});

test("IpAllowlistDrawer renders a default-open drawer with an error", () => {
  const view = mount(<IpAllowlistDrawer defaultOpen error="add denied" />);
  try {
    expect(pageText()).toContain("Add New IP Range");
    expect(pageText()).toContain("add denied");

    setInputValue('input[placeholder="0.0.0.0/0"]', "203.0.113.9");
    clickByText("Add to Allowlist");
    expect(pageText()).toContain("Add New IP Range");
  } finally {
    view.cleanup();
  }
});
