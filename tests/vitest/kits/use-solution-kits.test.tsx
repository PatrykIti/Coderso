// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { useSolutionKits } from "../../../core/admin/ui/kits/hooks/useSolutionKits";
import type { SolutionKitSummary } from "../../../core/admin/services/solutionKitsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listSolutionKitsCachedMock = vi.fn();
const getCachedSolutionKitsMock = vi.fn();

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: () => getCachedSolutionKitsMock(),
  listSolutionKitsCached: (...args: unknown[]) => listSolutionKitsCachedMock(...args),
}));

vi.mock("@/services/apiClient", async () => {
  const actual = await vi.importActual<typeof import("../../../core/admin/services/apiClient")>(
    "../../../core/admin/services/apiClient"
  );
  return {
    ...actual,
    isApiClientError: actual.isApiClientError,
  };
});

const kitSummary = (overrides: Partial<SolutionKitSummary> = {}): SolutionKitSummary => ({
  id: "automotive-workshop",
  title: "Automotive Workshop",
  shortDescription: "Garage site",
  recommendedModules: ["booking", "forms"],
  features: ["Lead form"],
  ...overrides,
});

const mountHook = (options?: { skip?: boolean }) => {
  let latest: ReturnType<typeof useSolutionKits> | undefined;

  const Harness = () => {
    latest = useSolutionKits(options);
    return <div>kits-hook</div>;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<Harness />);
  });

  return {
    get value() {
      if (!latest) throw new Error("Missing hook state");
      return latest;
    },
    cleanup() {
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
    await Promise.resolve();
  });
};

beforeEach(() => {
  listSolutionKitsCachedMock.mockReset();
  getCachedSolutionKitsMock.mockReset();
  getCachedSolutionKitsMock.mockReturnValue(null);
  listSolutionKitsCachedMock.mockResolvedValue([kitSummary()]);
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("useSolutionKits loads kits on mount and exposes refresh", async () => {
  const view = mountHook();
  await flush();

  try {
    expect(view.value.items).toEqual([kitSummary()]);
    expect(view.value.isLoading).toBe(false);
    expect(view.value.error).toBeNull();
    expect(listSolutionKitsCachedMock).toHaveBeenCalledWith({ force: true });

    // Force refresh replaces the list and clears errors.
    const next = [kitSummary({ id: "medical-clinic", title: "Medical Clinic" })];
    listSolutionKitsCachedMock.mockResolvedValueOnce(next);
    await React.act(async () => {
      await view.value.refresh(true);
    });
    expect(view.value.items).toEqual(next);
  } finally {
    view.cleanup();
  }
});

test("useSolutionKits hydrates from the synchronous cache without a loading flag", () => {
  getCachedSolutionKitsMock.mockReturnValue([kitSummary({ id: "beauty-salon" })]);
  const view = mountHook();

  try {
    // The cached list seeds initial state, so loading starts false.
    expect(view.value.items).toEqual([kitSummary({ id: "beauty-salon" })]);
    expect(view.value.isLoading).toBe(false);
    expect(listSolutionKitsCachedMock).toHaveBeenCalledWith({ force: true });
  } finally {
    view.cleanup();
  }
});

test("useSolutionKits reports ApiClientError, plain Error, and fallback failures", async () => {
  const view = mountHook();
  await flush();

  try {
    listSolutionKitsCachedMock.mockRejectedValueOnce(
      new ApiClientError("x", "api error message", 400)
    );
    await React.act(async () => {
      await view.value.refresh();
    });
    expect(view.value.error).toBe("api error message");

    listSolutionKitsCachedMock.mockRejectedValueOnce(new Error("generic boom"));
    await React.act(async () => {
      await view.value.refresh();
    });
    expect(view.value.error).toBe("generic boom");

    listSolutionKitsCachedMock.mockRejectedValueOnce("string failure");
    await React.act(async () => {
      await view.value.refresh();
    });
    expect(view.value.error).toBe("Failed to load solution kits.");
    expect(view.value.isLoading).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("useSolutionKits with skip=true skips the mount fetch and keeps items", async () => {
  const view = mountHook({ skip: true });
  await flush();

  try {
    expect(listSolutionKitsCachedMock).not.toHaveBeenCalled();
    expect(view.value.items).toEqual([]);
    expect(view.value.isLoading).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("useSolutionKits surfaces mount-load failures into the error state", async () => {
  listSolutionKitsCachedMock.mockRejectedValueOnce(new ApiClientError("x", "mount failure", 500));
  const view = mountHook();
  await flush();

  try {
    expect(view.value.error).toBe("mount failure");
    expect(view.value.items).toEqual([]);
    expect(view.value.isLoading).toBe(false);
  } finally {
    view.cleanup();
  }
});
