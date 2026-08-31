// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminAccessCard } from "../../../core/admin/ui/settings/AdminAccessCard";
import { ApiKeyDialog } from "../../../core/admin/ui/settings/ApiKeyDialog";
import { ApiKeysPage } from "../../../core/admin/ui/settings/ApiKeysPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

type ApiKeyRecordFixture = {
  id: string;
  name: string;
  scopes: string[];
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type ApiKeyResultFixture = {
  item: ApiKeyRecordFixture;
  secret: string;
};

type ListApiKeysMock = () => Promise<ApiKeyRecordFixture[]>;
type CreateApiKeyMock = (payload: {
  name: string;
  scopes: string[];
}) => Promise<ApiKeyResultFixture>;
type RotateApiKeyMock = (id: string) => Promise<ApiKeyResultFixture>;
type RevokeApiKeyMock = (id: string) => Promise<{ ok: boolean }>;

type ApiKeysTableMockProps = {
  items: ApiKeyRecordFixture[];
  isLoading?: boolean;
  copyableIds?: Set<string>;
  onCopy?: (key: ApiKeyRecordFixture) => void;
  onRotate?: (key: ApiKeyRecordFixture) => void;
  onRevoke?: (key: ApiKeyRecordFixture) => void;
};

type ConfirmActionDialogMockProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: {
    title: string;
    description: React.ReactNode;
    targetLabel?: string;
    confirmLabel: string;
    variant: "destructive" | "warning";
    onConfirm: () => void | Promise<void>;
  };
};

const apiKeysState = vi.hoisted(() => {
  const activeKey = {
    id: "key-1",
    name: "Build hook",
    scopes: ["content:read"],
    prefix: "ck_live",
    createdAt: "2026-06-01T10:00:00.000Z",
    lastUsedAt: null,
    revokedAt: null,
  };
  const state = {
    items: [activeKey] as ApiKeyRecordFixture[],
    listApiKeys: vi.fn<ListApiKeysMock>(),
    createApiKey: vi.fn<CreateApiKeyMock>(),
    rotateApiKey: vi.fn<RotateApiKeyMock>(),
    revokeApiKey: vi.fn<RevokeApiKeyMock>(),
    reset() {
      state.items = [activeKey];
      state.listApiKeys.mockReset();
      state.createApiKey.mockReset();
      state.rotateApiKey.mockReset();
      state.revokeApiKey.mockReset();
      state.listApiKeys.mockImplementation(async () => state.items);
      state.createApiKey.mockResolvedValue({
        item: activeKey,
        secret: "created-secret",
      });
      state.rotateApiKey.mockResolvedValue({
        item: { ...activeKey, prefix: "ck_rotated" },
        secret: "rotated-secret",
      });
      state.revokeApiKey.mockResolvedValue({ ok: true });
    },
  };
  return state;
});

vi.mock("@/services/apiKeysClient", () => ({
  createApiKey: apiKeysState.createApiKey,
  listApiKeys: apiKeysState.listApiKeys,
  revokeApiKey: apiKeysState.revokeApiKey,
  rotateApiKey: apiKeysState.rotateApiKey,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "message" in error),
}));

vi.mock("../../../core/admin/ui/settings/ApiKeysTable", () => ({
  ApiKeysTable: ({
    items,
    isLoading,
    copyableIds,
    onCopy,
    onRotate,
    onRevoke,
  }: ApiKeysTableMockProps) => (
    <section>
      <span>{isLoading ? "api-keys-loading" : `api-keys:${items.length}`}</span>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.name}</span>
          <span>{`copyable:${item.id}:${copyableIds?.has(item.id) ?? false}`}</span>
          <button type="button" onClick={() => onCopy?.(item)}>
            {`copy-${item.id}`}
          </button>
          <button type="button" onClick={() => onRotate?.(item)}>
            {`request-rotate-${item.id}`}
          </button>
          <button type="button" onClick={() => onRevoke?.(item)}>
            {`request-revoke-${item.id}`}
          </button>
        </div>
      ))}
    </section>
  ),
}));

vi.mock("../../../core/admin/ui/settings/ApiKeySecretDialog", () => ({
  ApiKeySecretDialog: ({
    open,
    onOpenChange,
    name,
    secret,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    secret: string;
  }) =>
    open ? (
      <section>
        <span>{`secret-dialog:${name}`}</span>
        <code>{secret}</code>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-secret
        </button>
      </section>
    ) : null,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({ open, onOpenChange, action }: ConfirmActionDialogMockProps) =>
    open && action ? (
      <section>
        <span>{action.title}</span>
        <span>{action.description}</span>
        <span>{action.targetLabel}</span>
        <button type="button" onClick={() => onOpenChange(false)}>
          cancel-confirm
        </button>
        <button
          type="button"
          onClick={() => {
            void Promise.resolve(action.onConfirm())
              .catch(() => undefined)
              .then(() => onOpenChange(false));
          }}
        >
          {`confirm-${action.confirmLabel}`}
        </button>
      </section>
    ) : null,
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

function typeKeyName(value: string) {
  const input = document.body.querySelector<HTMLInputElement>("#api-key-name");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing input #api-key-name");
  }
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const pageText = () => document.body.textContent ?? "";

const scopeCheckbox = (index: number) =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[data-slot="checkbox"]'))[index];

const apiError = (message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
};

beforeEach(() => {
  apiKeysState.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

test("ApiKeysPage create flow validates, submits scopes, and shows the secret once", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(pageText()).toContain("api-keys:1");

    clickByText("Create API Key");
    await flush();

    const createButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Create Key"
    );
    expect((createButton as HTMLButtonElement).disabled).toBe(true);

    typeKeyName("  Analytics Pipeline  ");
    await flush();
    expect((createButton as HTMLButtonElement).disabled).toBe(false);

    const extraScope = scopeCheckbox(1);
    await act(async () => {
      extraScope.click();
      await Promise.resolve();
    });
    await flush();
    expect(pageText()).toContain("3 scopes selected");

    clickByText("Create Key");
    await flush();
    await flush();

    expect(apiKeysState.createApiKey).toHaveBeenCalledTimes(1);
    expect(apiKeysState.createApiKey.mock.calls[0][0]).toEqual({
      name: "Analytics Pipeline",
      scopes: expect.arrayContaining(["content.read", "content.write"]),
    });
    expect(pageText()).toContain("secret-dialog:Build hook");
    expect(pageText()).toContain("created-secret");
    expect(pageText()).toContain("copyable:key-1:true");

    clickByText("close-secret");
    await flush();
    expect(pageText()).toContain("copyable:key-1:false");
    expect(pageText()).not.toContain("created-secret");
  } finally {
    view.cleanup();
  }
});

test("ApiKeyDialog enforces a scope selection", async () => {
  const view = mount(
    <ApiKeyDialog open onOpenChange={() => undefined} onCreate={async () => undefined} />
  );

  try {
    typeKeyName("CI runner");
    await flush();

    const scopeButtons = Array.from(
      document.body.querySelectorAll<HTMLElement>('[data-slot="checkbox"]')
    );
    for (const index of [0, 2]) {
      await act(async () => {
        scopeButtons[index].click();
        await Promise.resolve();
      });
    }
    await flush();
    expect(pageText()).toContain("0 scopes selected");

    const createButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Create Key"
    );
    expect((createButton as HTMLButtonElement).disabled).toBe(true);
    expect(apiKeysState.createApiKey).not.toHaveBeenCalled();

    await act(async () => {
      scopeButtons[0].click();
      await Promise.resolve();
    });
    await flush();
    expect(pageText()).toContain("1 scope selected");
    expect((createButton as HTMLButtonElement).disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("ApiKeyDialog resets its form when closed via onOpenChange", async () => {
  let open = true;
  const view = mount(
    <ApiKeyDialog
      open={open}
      onOpenChange={(next) => {
        open = next;
      }}
      onCreate={async () => undefined}
    />
  );

  try {
    typeKeyName("Stale name");
    await flush();
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await flush();
    expect(open).toBe(false);
    const inputAfterClose = document.body.querySelector<HTMLInputElement>("#api-key-name");
    expect(inputAfterClose?.value ?? "").toBe("");
    expect(pageText()).toContain("2 scopes selected");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage surfaces create errors from the endpoint and generic fallback", async () => {
  apiKeysState.createApiKey.mockRejectedValueOnce(apiError("endpoint rejected"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    clickByText("Create API Key");
    await flush();
    typeKeyName("Broken key");
    clickByText("Create Key");
    await flush();
    await flush();
    expect(pageText()).toContain("endpoint rejected");

    apiKeysState.createApiKey.mockRejectedValueOnce({ code: "boom" });
    typeKeyName("Broken key 2");
    clickByText("Create Key");
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to create API key.");

    const closeButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.getAttribute("aria-label") === "Close create API key dialog"
    );
    expect(closeButton).toBeDefined();
    act(() => {
      (closeButton as HTMLButtonElement).click();
    });
    await flush();
    expect(pageText()).not.toContain("Failed to create API key.");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage clears the dialog error when the dialog is closed", async () => {
  apiKeysState.createApiKey.mockRejectedValueOnce(apiError("still failing"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    clickByText("Create API Key");
    await flush();
    typeKeyName("Retry key");
    clickByText("Create Key");
    await flush();
    await flush();
    expect(pageText()).toContain("still failing");

    clickByText("Cancel");
    await flush();
    clickByText("Create API Key");
    await flush();
    expect(pageText()).not.toContain("still failing");
    expect(document.body.querySelector<HTMLInputElement>("#api-key-name")?.value).toBe("");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage shows load errors from the endpoint and generic fallback", async () => {
  apiKeysState.listApiKeys.mockRejectedValueOnce(apiError("listing failed"));
  const first = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );
  try {
    await flush();
    await flush();
    expect(pageText()).toContain("listing failed");
  } finally {
    first.cleanup();
  }

  apiKeysState.listApiKeys.mockRejectedValueOnce({ code: "boom" });
  const second = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );
  try {
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to load API keys.");
  } finally {
    second.cleanup();
  }
});

test("ApiKeysPage surfaces rotate errors and keeps the original key", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    apiKeysState.rotateApiKey.mockRejectedValueOnce(apiError("rotate denied"));
    clickByText("request-rotate-key-1");
    await flush();
    clickByText("confirm-Rotate key");
    await flush();
    await flush();
    expect(pageText()).toContain("rotate denied");

    apiKeysState.rotateApiKey.mockRejectedValueOnce({ code: "boom" });
    clickByText("request-rotate-key-1");
    await flush();
    clickByText("confirm-Rotate key");
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to rotate API key.");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage rotates a key successfully and shows the new secret", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    clickByText("request-rotate-key-1");
    await flush();
    clickByText("confirm-Rotate key");
    await flush();
    await flush();

    expect(apiKeysState.rotateApiKey).toHaveBeenCalledWith("key-1");
    expect(pageText()).toContain("secret-dialog:Build hook");
    expect(pageText()).toContain("rotated-secret");
    expect(pageText()).toContain("copyable:key-1:true");

    clickByText("close-secret");
    await flush();
    expect(pageText()).toContain("copyable:key-1:false");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage surfaces revoke errors and refresh failures", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    apiKeysState.revokeApiKey.mockRejectedValueOnce(apiError("revoke denied"));
    clickByText("request-revoke-key-1");
    await flush();
    clickByText("confirm-Revoke key");
    await flush();
    await flush();
    expect(pageText()).toContain("revoke denied");

    apiKeysState.revokeApiKey.mockRejectedValueOnce({ code: "boom" });
    clickByText("request-revoke-key-1");
    await flush();
    clickByText("confirm-Revoke key");
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to revoke API key.");

    apiKeysState.listApiKeys.mockRejectedValueOnce(apiError("refresh broken"));
    clickByText("request-revoke-key-1");
    await flush();
    clickByText("confirm-Revoke key");
    await flush();
    await flush();
    expect(pageText()).toContain("refresh broken");

    apiKeysState.listApiKeys.mockRejectedValueOnce({ code: "boom" });
    clickByText("request-revoke-key-1");
    await flush();
    clickByText("confirm-Revoke key");
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to load API keys.");

    clickByText("request-revoke-key-1");
    await flush();
    clickByText("confirm-Revoke key");
    await flush();
    await flush();
    expect(apiKeysState.revokeApiKey).toHaveBeenCalledTimes(5);
    expect(pageText()).toContain("api-keys:1");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage copies a one-time secret to the clipboard", async () => {
  const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    clickByText("copy-key-1");
    await flush();
    expect(writeText).not.toHaveBeenCalled();

    clickByText("Create API Key");
    await flush();
    typeKeyName("Copy me");
    clickByText("Create Key");
    await flush();
    await flush();
    expect(pageText()).toContain("copyable:key-1:true");

    clickByText("copy-key-1");
    await flush();
    expect(writeText).toHaveBeenCalledWith("created-secret");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage disables the create button while a key is being created", async () => {
  let resolveCreate: ((value: ApiKeyResultFixture) => void) | undefined;
  apiKeysState.createApiKey.mockImplementation(
    () =>
      new Promise<ApiKeyResultFixture>((resolve) => {
        resolveCreate = resolve;
      })
  );
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    clickByText("Create API Key");
    await flush();
    typeKeyName("Pending key");
    clickByText("Create Key");
    await flush();

    const creatingButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Creating..."
    );
    expect(creatingButton).toBeDefined();
    expect((creatingButton as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveCreate?.({
        item: {
          id: "key-9",
          name: "Pending key",
          scopes: ["content:read"],
          prefix: "ck_pending",
          createdAt: "2026-07-01T00:00:00.000Z",
          lastUsedAt: null,
          revokedAt: null,
        },
        secret: "pending-secret",
      });
      await Promise.resolve();
    });
    await flush();
    expect(pageText()).toContain("pending-secret");
  } finally {
    view.cleanup();
  }
});

test("AdminAccessCard wires onChange for path and redirect", () => {
  const onChange = vi.fn();
  const view = mount(
    <AdminAccessCard adminPath="/admin" redirectEnabled={false} onChange={onChange} />
  );

  try {
    const pathInput = view.container.querySelector<HTMLInputElement>("#admin-path");
    expect(pathInput?.value).toBe("/admin");

    act(() => {
      setNativeInputValue(pathInput as HTMLInputElement, "/admin-panel");
    });
    expect(onChange).toHaveBeenLastCalledWith({
      adminPath: "/admin-panel",
      redirectEnabled: false,
    });

    const switchButton =
      view.container.querySelector<HTMLElement>('[role="switch"]') ??
      Array.from(view.container.querySelectorAll("button")).find(
        (candidate) => candidate.getAttribute("data-slot") === "switch"
      );
    expect(switchButton).not.toBeNull();
    act(() => {
      switchButton?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith({
      adminPath: "/admin",
      redirectEnabled: true,
    });
  } finally {
    view.cleanup();
  }
});

test("AdminAccessCard renders the error message and marks the input invalid", () => {
  const view = mount(
    <AdminAccessCard
      adminPath="/admin"
      redirectEnabled={true}
      error="Path must be a single segment."
    />
  );

  try {
    expect(view.container.textContent).toContain("Path must be a single segment.");
    expect(
      view.container.querySelector<HTMLInputElement>("#admin-path")?.getAttribute("aria-invalid")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});
