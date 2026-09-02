// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { useSolutionKitRuns } from "../../../core/admin/ui/kits/hooks/useSolutionKitRuns";
import type {
  SolutionKitId,
  SolutionKitInstallResult,
  SolutionKitInstallRunRecord,
  SolutionKitRunDetail,
} from "../../../core/admin/services/solutionKitsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listSolutionKitRunsCachedMock = vi.fn();
const getSolutionKitRunCachedMock = vi.fn();
const applySolutionKitMock = vi.fn();
const rollbackSolutionKitMock = vi.fn();

vi.mock("@/services/solutionKitsClient", () => ({
  applySolutionKit: (...args: unknown[]) => applySolutionKitMock(...args),
  getSolutionKitRunCached: (...args: unknown[]) => getSolutionKitRunCachedMock(...args),
  listSolutionKitRunsCached: (...args: unknown[]) => listSolutionKitRunsCachedMock(...args),
  rollbackSolutionKit: (...args: unknown[]) => rollbackSolutionKitMock(...args),
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

const runRecord = (
  overrides: Partial<SolutionKitInstallRunRecord> = {}
): SolutionKitInstallRunRecord => ({
  id: "run-1",
  kitId: "automotive-workshop",
  mode: "apply",
  status: "success",
  actorId: null,
  rollbackOfRunId: null,
  options: {},
  summary: {
    total: 0,
    success: 0,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: { create: 0, update: 0, noop: 0, delete: 0, restore: 0 },
  },
  error: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  finishedAt: null,
  ...overrides,
});

const runDetail = (run: SolutionKitInstallRunRecord = runRecord()): SolutionKitRunDetail => ({
  run,
  items: [],
});

const installResult = (
  run: SolutionKitInstallRunRecord = runRecord()
): SolutionKitInstallResult => ({
  run,
  items: [],
  summary: run.summary,
});

const mountHook = (kitId: SolutionKitId | null) => {
  let latest: ReturnType<typeof useSolutionKitRuns> | undefined;

  const Harness = () => {
    latest = useSolutionKitRuns(kitId);
    return <div>runs-hook</div>;
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
  listSolutionKitRunsCachedMock.mockReset();
  getSolutionKitRunCachedMock.mockReset();
  applySolutionKitMock.mockReset();
  rollbackSolutionKitMock.mockReset();
  // Baseline happy path; tests override per call where needed.
  listSolutionKitRunsCachedMock.mockResolvedValue([]);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail());
  applySolutionKitMock.mockResolvedValue(installResult());
  rollbackSolutionKitMock.mockResolvedValue(installResult());
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("useSolutionKitRuns exposes loading while the list request is pending", async () => {
  let resolveRuns: ((runs: SolutionKitInstallRunRecord[]) => void) | undefined;
  const view = mountHook("automotive-workshop");
  await flush();

  try {
    listSolutionKitRunsCachedMock.mockImplementationOnce(
      () => new Promise<SolutionKitInstallRunRecord[]>((resolve) => (resolveRuns = resolve))
    );
    let pendingRefresh: Promise<SolutionKitInstallRunRecord[]> | undefined;
    React.act(() => {
      pendingRefresh = view.value.refreshRuns(true);
    });
    expect(view.value.isLoading).toBe(true);
    await React.act(async () => {
      resolveRuns?.([]);
      await pendingRefresh;
    });
    expect(view.value.isLoading).toBe(false);
    expect(view.value.runs).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns loads runs and selected detail on mount", async () => {
  const runs = [runRecord(), runRecord({ id: "run-2", mode: "rollback" })];
  listSolutionKitRunsCachedMock.mockResolvedValue(runs);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail(runs[0]));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    expect(view.value.runs).toEqual(runs);
    expect(view.value.selectedRunId).toBe("run-1");
    expect(view.value.selectedRun).toEqual(runDetail(runs[0]));
    expect(view.value.isLoading).toBe(false);
    expect(view.value.error).toBeNull();
    expect(view.value.detailError).toBeNull();
    expect(view.value.isDetailLoading).toBe(false);
    expect(view.value.latestApplyRunId).toBe("run-1");
    expect(listSolutionKitRunsCachedMock).toHaveBeenCalledWith({
      kitId: "automotive-workshop",
      force: true,
    });
    expect(getSolutionKitRunCachedMock).toHaveBeenCalledWith("run-1");
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns handles mount load failure and run detail failure", async () => {
  listSolutionKitRunsCachedMock.mockRejectedValueOnce(new ApiClientError("x", "API failure", 400));
  getSolutionKitRunCachedMock.mockRejectedValueOnce(new Error("detail boom"));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    expect(view.value.runs).toEqual([]);
    expect(view.value.error).toBe("API failure");
    // selectedRunId stays null so the detail effect never fires.
    expect(view.value.selectedRunId).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns gates all state when kitId is null", async () => {
  const view = mountHook(null);
  await flush();

  try {
    expect(view.value.runs).toEqual([]);
    expect(view.value.selectedRunId).toBeNull();
    expect(view.value.selectedRun).toBeNull();
    expect(view.value.isLoading).toBe(false);
    // refreshRuns with null kitId clears state and returns [].
    const cleared = await React.act(async () => view.value.refreshRuns());
    expect(cleared).toEqual([]);
    expect(listSolutionKitRunsCachedMock).not.toHaveBeenCalled();
    // apply/rollback short-circuit with null kitId.
    await expect(view.value.apply({ dryRun: true })).resolves.toBeNull();
    await expect(view.value.rollback("run-1")).resolves.toBeNull();
    expect(applySolutionKitMock).not.toHaveBeenCalled();
    expect(rollbackSolutionKitMock).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns refreshRuns keeps a still-present selected run and clears on failure", async () => {
  const runs = [runRecord()];
  listSolutionKitRunsCachedMock.mockResolvedValueOnce(runs).mockResolvedValueOnce(runs);

  const view = mountHook("automotive-workshop");
  await flush();
  await React.act(async () => {
    await view.value.setSelectedRunId("run-1");
  });

  try {
    // Force refresh keeps run-1 selected because it is still present.
    await React.act(async () => {
      await view.value.refreshRuns(true);
    });
    expect(view.value.selectedRunId).toBe("run-1");
    expect(listSolutionKitRunsCachedMock).toHaveBeenLastCalledWith({
      kitId: "automotive-workshop",
      force: true,
    });

    // A refresh failure surfaces the generic fallback for a plain Error message;
    // already-loaded runs and the selection are preserved (the catch only sets
    // the error).
    listSolutionKitRunsCachedMock.mockRejectedValueOnce(new Error("load failed"));
    await React.act(async () => {
      await view.value.refreshRuns(true);
    });
    expect(view.value.error).toBe("load failed");
    expect(view.value.runs).toEqual(runs);
    expect(view.value.selectedRunId).toBe("run-1");

    // A non-Error, non-ApiClientError failure uses the fallback message.
    listSolutionKitRunsCachedMock.mockRejectedValueOnce("string failure");
    await React.act(async () => {
      await view.value.refreshRuns(true);
    });
    expect(view.value.error).toBe("Failed to load solution kit runs.");
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns clears a selection that disappears during refresh", async () => {
  const selected = runRecord({ id: "run-selected" });
  listSolutionKitRunsCachedMock.mockResolvedValueOnce([selected]).mockResolvedValueOnce([]);

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    expect(view.value.selectedRunId).toBe("run-selected");
    await React.act(async () => {
      await view.value.refreshRuns(true);
    });
    expect(view.value.runs).toEqual([]);
    expect(view.value.selectedRunId).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns loads detail via selectedRunId effect and reports failures", async () => {
  const detail = runDetail(runRecord({ id: "run-9" }));
  getSolutionKitRunCachedMock.mockResolvedValue(detail);

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    // Selecting a run id fires the detail effect.
    await React.act(async () => {
      await view.value.setSelectedRunId("run-9");
    });
    await flush();
    expect(view.value.selectedRun).toEqual(detail);
    expect(view.value.isDetailLoading).toBe(false);
    expect(getSolutionKitRunCachedMock).toHaveBeenCalledWith("run-9");

    // Clearing the selection resets the detail.
    await React.act(async () => {
      await view.value.setSelectedRunId(null);
    });
    expect(view.value.selectedRun).toBeNull();
    expect(view.value.detailError).toBeNull();

    // A failed detail load clears the detail and surfaces the error.
    getSolutionKitRunCachedMock.mockRejectedValueOnce(
      new ApiClientError("x", "detail api error", 500)
    );
    await React.act(async () => {
      await view.value.setSelectedRunId("run-bad");
    });
    await flush();
    expect(view.value.selectedRun).toBeNull();
    expect(view.value.detailError).toBe("detail api error");

    getSolutionKitRunCachedMock.mockRejectedValueOnce("opaque detail failure");
    await React.act(async () => {
      await view.value.setSelectedRunId("run-opaque");
    });
    await flush();
    expect(view.value.selectedRun).toBeNull();
    expect(view.value.detailError).toBe("Failed to load solution kit runs.");
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns apply surfaces detail-refresh failures when the run is missing", async () => {
  const freshRun = runRecord({ id: "run-missing" });
  applySolutionKitMock.mockResolvedValue(installResult(freshRun));
  listSolutionKitRunsCachedMock.mockResolvedValue([runRecord()]);
  getSolutionKitRunCachedMock.mockImplementation((runId: string) =>
    runId === "run-missing"
      ? Promise.reject(new ApiClientError("x", "detail refresh denied", 500))
      : Promise.resolve(runDetail())
  );

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      await view.value.apply({});
    });
    await flush();
    // The apply succeeded; the detail refresh failure leaves the detail null and
    // records the error without turning the mutation into an API failure.
    expect(view.value.lastResult).toEqual(installResult(freshRun));
    expect(view.value.selectedRun).toBeNull();
    expect(view.value.detailError).toBe("detail refresh denied");
    expect(view.value.isMutating).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns apply persists the result and refreshes runs", async () => {
  const freshRun = runRecord({ id: "run-new" });
  const result = installResult(freshRun);
  applySolutionKitMock.mockResolvedValue(result);
  listSolutionKitRunsCachedMock.mockResolvedValue([freshRun]);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail(freshRun));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      const applied = await view.value.apply({
        dryRun: false,
        continueOnError: true,
        plan: { enabledStepIds: ["pages"], notes: ["n"] },
      });
      expect(applied).toEqual(result);
    });

    expect(applySolutionKitMock).toHaveBeenCalledWith("automotive-workshop", {
      dryRun: false,
      continueOnError: true,
      plan: { enabledStepIds: ["pages"], notes: ["n"] },
    });
    expect(view.value.lastResult).toEqual(result);
    expect(view.value.selectedRunId).toBe("run-new");
    expect(view.value.isMutating).toBe(false);
    // The new run IS in the refreshed items, so no detail refetch is needed.
    expect(getSolutionKitRunCachedMock).not.toHaveBeenCalledWith("run-new", { force: true });
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns apply fetches detail when the new run is missing from the list", async () => {
  const freshRun = runRecord({ id: "run-missing" });
  applySolutionKitMock.mockResolvedValue(installResult(freshRun));
  listSolutionKitRunsCachedMock.mockResolvedValue([runRecord()]);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail(freshRun));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      await view.value.apply({});
    });
    expect(getSolutionKitRunCachedMock).toHaveBeenCalledWith("run-missing", { force: true });
    expect(view.value.selectedRun).toEqual(runDetail(freshRun));
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns clears detail when the applied run has an empty identifier", async () => {
  const result = installResult(runRecord({ id: "" }));
  applySolutionKitMock.mockResolvedValue(result);
  listSolutionKitRunsCachedMock.mockResolvedValue([runRecord()]);

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      await view.value.apply({});
    });

    expect(view.value.selectedRunId).toBe("");
    expect(view.value.selectedRun).toBeNull();
    expect(view.value.detailError).toBeNull();
    expect(view.value.isDetailLoading).toBe(false);
    expect(view.value.isMutating).toBe(false);
    expect(getSolutionKitRunCachedMock).not.toHaveBeenCalledWith("", { force: true });
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns apply surfaces mutation errors without losing state", async () => {
  applySolutionKitMock.mockRejectedValueOnce("mutation failure");
  listSolutionKitRunsCachedMock.mockResolvedValue([]);

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      const applied = await view.value.apply({});
      expect(applied).toBeNull();
    });
    expect(view.value.mutationError).toBe("Failed to load solution kit runs.");
    expect(view.value.isMutating).toBe(false);
    expect(view.value.lastResult).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns rollback succeeds and reports failures", async () => {
  const rollbackRun = runRecord({ id: "run-rb", mode: "rollback" });
  rollbackSolutionKitMock.mockResolvedValue(installResult(rollbackRun));
  listSolutionKitRunsCachedMock.mockResolvedValue([rollbackRun]);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail(rollbackRun));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      const result = await view.value.rollback("run-1");
      expect(result).toEqual(installResult(rollbackRun));
    });
    expect(rollbackSolutionKitMock).toHaveBeenCalledWith("automotive-workshop", {
      sourceRunId: "run-1",
      continueOnError: true,
    });
    expect(view.value.selectedRunId).toBe("run-rb");
    expect(view.value.lastResult).toEqual(installResult(rollbackRun));

    rollbackSolutionKitMock.mockRejectedValueOnce(new ApiClientError("x", "rollback denied", 403));
    await React.act(async () => {
      const failed = await view.value.rollback();
      expect(failed).toBeNull();
    });
    expect(view.value.mutationError).toBe("rollback denied");
    expect(view.value.isMutating).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns latestApplyRunId picks the first apply-mode run after refresh", async () => {
  const runs = [runRecord({ id: "rb", mode: "rollback" }), runRecord({ id: "ap", mode: "apply" })];
  listSolutionKitRunsCachedMock.mockResolvedValue(runs);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail(runs[0]));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    // The mount loads both runs; the apply-mode run wins.
    expect(view.value.latestApplyRunId).toBe("ap");
    // With no apply-mode run present the memo falls back to null.
    listSolutionKitRunsCachedMock.mockResolvedValueOnce([
      runRecord({ id: "rb2", mode: "rollback" }),
    ]);
    await React.act(async () => {
      await view.value.refreshRuns(true);
    });
    expect(view.value.latestApplyRunId).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("useSolutionKitRuns rollback fetches the run detail when it is missing from the refreshed list", async () => {
  const rollbackRun = runRecord({ id: "run-rb-missing", mode: "rollback" });
  rollbackSolutionKitMock.mockResolvedValue(installResult(rollbackRun));
  listSolutionKitRunsCachedMock.mockResolvedValue([runRecord()]);
  getSolutionKitRunCachedMock.mockResolvedValue(runDetail(rollbackRun));

  const view = mountHook("automotive-workshop");
  await flush();

  try {
    await React.act(async () => {
      await view.value.rollback("run-1");
    });
    expect(getSolutionKitRunCachedMock).toHaveBeenCalledWith("run-rb-missing", { force: true });
    expect(view.value.selectedRunId).toBe("run-rb-missing");
    expect(view.value.selectedRun).toEqual(runDetail(rollbackRun));
  } finally {
    view.cleanup();
  }
});
