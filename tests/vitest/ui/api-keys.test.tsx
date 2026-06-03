// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";

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
        item: {
          ...activeKey,
          prefix: "ck_rotated",
        },
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
  ApiKeysTable: ({ items, isLoading, copyableIds, onRotate, onRevoke }: ApiKeysTableMockProps) => (
    <section>
      <span>Scope</span>
      <span>Status</span>
      <span>{isLoading ? "api-keys-loading" : `api-keys:${items.length}`}</span>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.name}</span>
          <span>{`copyable:${item.id}:${copyableIds?.has(item.id) ?? false}`}</span>
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
        <span>{`confirm-variant:${action.variant}`}</span>
        <button type="button" onClick={() => onOpenChange(false)}>
          cancel-confirm
        </button>
        <button
          type="button"
          onClick={() => {
            void Promise.resolve(action.onConfirm()).then(() => onOpenChange(false));
          }}
        >
          {`confirm-${action.confirmLabel}`}
        </button>
      </section>
    ) : null,
}));

import { ApiKeyDialog } from "../../../core/admin/ui/settings/ApiKeyDialog";
import { ApiKeysPage } from "../../../core/admin/ui/settings/ApiKeysPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

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

function clickByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${text}`);
  }
  act(() => {
    button.click();
  });
}

beforeEach(() => {
  apiKeysState.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  vi.clearAllMocks();
});

test("ApiKeysPage renders header and table", () => {
  const html = renderAdminUi(<ApiKeysPage />);

  expect(html).toContain("API Keys");
  expect(html).toContain("Create API Key");
  expect(html).toContain("Scope");
  expect(html).toContain("Status");
});

test("ApiKeyDialog renders create form", () => {
  const view = mount(
    <ApiKeyDialog open onOpenChange={() => undefined} onCreate={async () => undefined} />
  );

  try {
    expect(document.body.textContent).toContain("Create API Key");
    expect(document.body.textContent).toContain("Key Name");
    expect(document.body.textContent).toContain("Scopes");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage gates rotate through a warning confirm and keeps the secret one-time", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("api-keys:1");

    clickByText(view.container, "request-rotate-key-1");
    await flush();

    expect(view.container.textContent).toContain("Rotate API key?");
    expect(view.container.textContent).toContain("confirm-variant:warning");
    expect(view.container.textContent).toContain("Build hook (ck_live...)");
    expect(apiKeysState.rotateApiKey).not.toHaveBeenCalled();

    clickByText(view.container, "cancel-confirm");
    await flush();
    expect(apiKeysState.rotateApiKey).not.toHaveBeenCalled();

    clickByText(view.container, "request-rotate-key-1");
    await flush();
    clickByText(view.container, "confirm-Rotate key");
    await flush();

    expect(apiKeysState.rotateApiKey).toHaveBeenCalledTimes(1);
    expect(apiKeysState.rotateApiKey).toHaveBeenCalledWith("key-1");
    expect(view.container.textContent).toContain("secret-dialog:Build hook");
    expect(view.container.textContent).toContain("rotated-secret");
    expect(view.container.textContent).toContain("copyable:key-1:true");

    clickByText(view.container, "close-secret");
    await flush();
    expect(view.container.textContent).not.toContain("rotated-secret");
    expect(view.container.textContent).toContain("copyable:key-1:false");
  } finally {
    view.cleanup();
  }
});

test("ApiKeysPage gates revoke through a destructive confirm", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    clickByText(view.container, "request-revoke-key-1");
    await flush();

    expect(view.container.textContent).toContain("Revoke API key?");
    expect(view.container.textContent).toContain("confirm-variant:destructive");
    expect(view.container.textContent).toContain("Build hook (ck_live...)");
    expect(apiKeysState.revokeApiKey).not.toHaveBeenCalled();

    clickByText(view.container, "cancel-confirm");
    await flush();
    expect(apiKeysState.revokeApiKey).not.toHaveBeenCalled();

    clickByText(view.container, "request-revoke-key-1");
    await flush();
    clickByText(view.container, "confirm-Revoke key");
    await flush();

    expect(apiKeysState.revokeApiKey).toHaveBeenCalledTimes(1);
    expect(apiKeysState.revokeApiKey).toHaveBeenCalledWith("key-1");
  } finally {
    view.cleanup();
  }
});
