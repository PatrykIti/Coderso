import { useCallback, useEffect, useMemo, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  applySolutionKit,
  getSolutionKitRunCached,
  listSolutionKitRunsCached,
  type SolutionKitPlanApplyInput,
  rollbackSolutionKit,
  type SolutionKitId,
  type SolutionKitInstallResult,
  type SolutionKitInstallRunRecord,
  type SolutionKitRunDetail,
} from "@/services/solutionKitsClient";

const resolveError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load solution kit runs.";
};

export function useSolutionKitRuns(kitId: SolutionKitId | null) {
  const [runs, setRuns] = useState<SolutionKitInstallRunRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<SolutionKitRunDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SolutionKitInstallResult | null>(null);

  const refreshRuns = useCallback(
    async (force = false) => {
      if (!kitId) {
        setRuns([]);
        setSelectedRunId(null);
        setSelectedRun(null);
        setError(null);
        return [];
      }

      setIsLoading(true);
      try {
        const items = await listSolutionKitRunsCached({
          kitId,
          force,
        });
        setRuns(items);
        setError(null);
        setSelectedRunId((previous) => {
          if (previous && items.some((item) => item.id === previous)) return previous;
          return items[0]?.id ?? null;
        });
        return items;
      } catch (error) {
        setError(resolveError(error));
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [kitId]
  );

  useEffect(() => {
    if (!kitId) return;
    let active = true;
    listSolutionKitRunsCached({ kitId, force: true })
      .then((items) => {
        if (!active) return;
        setRuns(items);
        setError(null);
        setSelectedRunId((previous) => {
          if (previous && items.some((item) => item.id === previous)) return previous;
          return items[0]?.id ?? null;
        });
      })
      .catch((error) => {
        if (active) setError(resolveError(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kitId]);

  const refreshRunDetail = useCallback(
    async (runId: string | null, force = false) => {
      if (!runId) {
        setSelectedRun(null);
        setDetailError(null);
        return null;
      }
      setIsDetailLoading(true);
      try {
        const detail = await getSolutionKitRunCached(runId, { force });
        setSelectedRun(detail);
        setDetailError(null);
        return detail;
      } catch (error) {
        setSelectedRun(null);
        setDetailError(resolveError(error));
        return null;
      } finally {
        setIsDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedRunId) return;
    let active = true;
    getSolutionKitRunCached(selectedRunId)
      .then((detail) => {
        if (!active) return;
        setSelectedRun(detail);
        setDetailError(null);
      })
      .catch((error) => {
        if (!active) return;
        setSelectedRun(null);
        setDetailError(resolveError(error));
      })
      .finally(() => {
        if (active) setIsDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedRunId]);

  const apply = useCallback(
    async (input: {
      dryRun?: boolean;
      continueOnError?: boolean;
      plan?: SolutionKitPlanApplyInput;
    }) => {
      if (!kitId) return null;
      setIsMutating(true);
      setMutationError(null);
      try {
        const result = await applySolutionKit(kitId, input);
        setLastResult(result);
        const items = await refreshRuns(true);
        setSelectedRunId(result.run.id);
        if (!items.some((item) => item.id === result.run.id)) {
          await refreshRunDetail(result.run.id, true);
        }
        return result;
      } catch (error) {
        setMutationError(resolveError(error));
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [kitId, refreshRunDetail, refreshRuns]
  );

  const rollback = useCallback(
    async (sourceRunId?: string) => {
      if (!kitId) return null;
      setIsMutating(true);
      setMutationError(null);
      try {
        const result = await rollbackSolutionKit(kitId, {
          sourceRunId,
          continueOnError: true,
        });
        setLastResult(result);
        const items = await refreshRuns(true);
        setSelectedRunId(result.run.id);
        if (!items.some((item) => item.id === result.run.id)) {
          await refreshRunDetail(result.run.id, true);
        }
        return result;
      } catch (error) {
        setMutationError(resolveError(error));
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [kitId, refreshRunDetail, refreshRuns]
  );

  const latestApplyRunId = useMemo(() => {
    const latest = runs.find((run) => run.mode === "apply");
    return latest?.id ?? null;
  }, [runs]);

  return {
    runs: kitId ? runs : [],
    isLoading,
    error,
    selectedRunId: kitId ? selectedRunId : null,
    setSelectedRunId,
    selectedRun: selectedRunId ? selectedRun : null,
    isDetailLoading,
    detailError,
    refreshRuns,
    apply,
    rollback,
    isMutating,
    mutationError,
    lastResult,
    latestApplyRunId,
  };
}
