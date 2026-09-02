// @vitest-environment happy-dom

// TASK-105-08-04 (Item G): useCustomScreens residual branches — API-error vs
// generic error messages, foreground refresh loading states, cache-event
// refresh, and mount fetch failures.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const customScreensMocks = vi.hoisted(() => {
  const listeners = new Set<(event: CacheEvent) => void>();
  return {
    cached: null as CustomScreenSummaryRecord[] | null,
    listScreens: vi.fn<(options?: { force?: boolean }) => Promise<CustomScreenSummaryRecord[]>>(),
    subscribeCacheEvents: vi.fn((handler: (event: CacheEvent) => void) => {
      listeners.add(handler);
      return () => listeners.delete(handler);
    }),
    listeners,
  };
});

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: () => customScreensMocks.cached,
  listCustomScreensCached: (options?: { force?: boolean }) =>
    customScreensMocks.listScreens(options),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: CacheEvent) => void) =>
    customScreensMocks.subscribeCacheEvents(handler),
}));

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { CacheEvent } from "../../../core/admin/utils/cacheBus";
import { useCustomScreens } from "../../../core/admin/ui/custom-screens/hooks/useCustomScreens";
import type { CustomScreenSummaryRecord } from "../../../core/services/customScreens/customScreenSummaryContract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Snapshot = ReturnType<typeof useCustomScreens>;
type SnapshotRef = { current: Snapshot | null };

const makeScreen = (id: string): CustomScreenSummaryRecord => ({
  id,
  name: `Screen ${id}`,
  contentTypeId: "content-type-1",
  status: "draft",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 4,
  createdAt: "2026-08-22T00:00:00.000Z",
  updatedAt: "2026-08-22T00:00:00.000Z",
});

const requireSnapshot = (snapshotRef: SnapshotRef) => {
  if (!snapshotRef.current) throw new Error("custom screens snapshot was not rendered");
  return snapshotRef.current;
};

function Harness({
  skip,
  onSnapshot,
}: {
  skip?: boolean;
  onSnapshot: (snapshot: Snapshot) => void;
}) {
  const snapshot = useCustomScreens({ skip });
  onSnapshot(snapshot);
  return null;
}

const mount = (props: { skip?: boolean; onSnapshot: (snapshot: Snapshot) => void }) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<Harness {...props} />);
  });
  return {
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  customScreensMocks.cached = null;
  customScreensMocks.listScreens.mockReset();
});

test("mount fetch failure surfaces a generic error message", async () => {
  customScreensMocks.cached = null;
  customScreensMocks.listScreens.mockRejectedValue(new Error("network down"));
  const snapshotRef: SnapshotRef = { current: null };
  const view = mount({
    onSnapshot: (value) => {
      snapshotRef.current = value;
    },
  });
  try {
    await flush();
    expect(requireSnapshot(snapshotRef).error).toBe("network down");
  } finally {
    view.cleanup();
  }
});

test("mount fetch failure maps ApiClientError to its message", async () => {
  customScreensMocks.cached = null;
  customScreensMocks.listScreens.mockRejectedValue(
    new ApiClientError("server_error", "Server rejected.", 500)
  );
  const snapshotRef: SnapshotRef = { current: null };
  const view = mount({
    onSnapshot: (value) => {
      snapshotRef.current = value;
    },
  });
  try {
    await flush();
    expect(requireSnapshot(snapshotRef).error).toBe("Server rejected.");
  } finally {
    view.cleanup();
  }
});

test("refresh toggles foreground loading and keeps cache-event refreshes background", async () => {
  customScreensMocks.cached = [makeScreen("cached")];
  customScreensMocks.listScreens.mockResolvedValue([makeScreen("mount")]);

  const snapshotRef: SnapshotRef = { current: null };
  const view = mount({
    onSnapshot: (value) => {
      snapshotRef.current = value;
    },
  });
  await flush();

  let resolveFirst: ((value: CustomScreenSummaryRecord[]) => void) | null = null;
  customScreensMocks.listScreens.mockImplementationOnce(
    () =>
      new Promise<CustomScreenSummaryRecord[]>((resolve) => {
        resolveFirst = resolve;
      })
  );

  try {
    // Foreground refresh sets loading true until it settles.
    let pending: Promise<void> | null = null;
    React.act(() => {
      pending = requireSnapshot(snapshotRef).refresh({ force: true, background: false });
    });
    await flush();
    expect(requireSnapshot(snapshotRef).isLoading).toBe(true);
    await React.act(async () => {
      resolveFirst?.([makeScreen("foreground")]);
    });
    if (!pending) throw new Error("foreground refresh did not start");
    await pending;
    await flush();
    expect(requireSnapshot(snapshotRef).isLoading).toBe(false);

    let resolveEvent: ((value: CustomScreenSummaryRecord[]) => void) | null = null;
    customScreensMocks.listScreens.mockImplementationOnce(
      () =>
        new Promise<CustomScreenSummaryRecord[]>((resolve) => {
          resolveEvent = resolve;
        })
    );
    const callsBeforeEvent = customScreensMocks.listScreens.mock.calls.length;

    // The cache event handler fires a forced background refresh.
    React.act(() => {
      for (const handler of customScreensMocks.listeners) {
        handler({
          key: cacheKeys.customScreensList,
          action: "update",
          sourceId: "test",
          ts: 0,
        });
      }
    });
    await flush();
    expect(customScreensMocks.listScreens).toHaveBeenCalledTimes(callsBeforeEvent + 1);
    expect(customScreensMocks.listScreens).toHaveBeenLastCalledWith({ force: true });
    expect(requireSnapshot(snapshotRef).isLoading).toBe(false);
    expect(requireSnapshot(snapshotRef).items).toEqual([makeScreen("foreground")]);
    await React.act(async () => {
      resolveEvent?.([makeScreen("cache-event")]);
    });
    await flush();
    expect(requireSnapshot(snapshotRef).items).toEqual([makeScreen("cache-event")]);
    expect(requireSnapshot(snapshotRef).isLoading).toBe(false);
    expect(requireSnapshot(snapshotRef).error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("refresh maps non-Error rejection to a generic message", async () => {
  customScreensMocks.cached = [makeScreen("cached")];
  customScreensMocks.listScreens.mockRejectedValue("string rejection");
  const snapshotRef: SnapshotRef = { current: null };
  const view = mount({
    onSnapshot: (value) => {
      snapshotRef.current = value;
    },
  });
  await flush();
  try {
    React.act(() => {
      void requireSnapshot(snapshotRef).refresh({ force: true });
    });
    await flush();
    expect(requireSnapshot(snapshotRef).error).toBe("Failed to load custom screens.");
  } finally {
    view.cleanup();
  }
});

test("skip mounts no fetch and no cache subscription", () => {
  const snapshotRef: SnapshotRef = { current: null };
  const view = mount({
    skip: true,
    onSnapshot: (value) => {
      snapshotRef.current = value;
    },
  });
  try {
    expect(requireSnapshot(snapshotRef).isLoading).toBe(true);
    expect(customScreensMocks.listScreens).not.toHaveBeenCalled();
    expect(customScreensMocks.listeners.size).toBe(0);
  } finally {
    view.cleanup();
  }
});
