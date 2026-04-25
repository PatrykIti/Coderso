import { toast } from "sonner";

export type ListActionToastVariant = "success" | "error";

type ResourceLabels = {
  singular: string;
  plural: string;
};

type BulkMessageInput = {
  count: number;
  succeededCount: number;
  failedCount: number;
  labels: ResourceLabels;
};

export type ListActionCopy = {
  pastTense: string;
  failureVerb: string;
  errorFallback?: string;
  singleSuccessMessage?: (input: {
    labels: ResourceLabels;
    targetLabel?: string;
  }) => string;
  bulkSuccessMessage?: (input: BulkMessageInput) => string;
  bulkPartialMessage?: (input: BulkMessageInput) => string;
  bulkFailureMessage?: (input: BulkMessageInput) => string;
};

export type ListActionToastConfig<TAction extends string> = {
  labels: ResourceLabels;
  actions: Record<TAction, ListActionCopy>;
};

export type ListBulkActionSummary<TAction extends string, TTarget> = {
  ok: boolean;
  action: TAction;
  toastMessage: string;
  inlineMessage: string;
  succeededCount: number;
  failedCount: number;
  failedTargets: TTarget[];
};

const capitalize = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const labelForCount = (labels: ResourceLabels, count: number) =>
  count === 1 ? labels.singular : labels.plural;

const formatTarget = (targetLabel?: string) =>
  targetLabel ? ` "${targetLabel}"` : "";

export const resolveListActionErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim() &&
    (
      (error as { name?: unknown }).name === "ApiClientError" ||
      "status" in error ||
      "code" in error
    )
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

export const createListActionToastAdapter = <TAction extends string>(
  config: ListActionToastConfig<TAction>
) => {
  const getAction = (action: TAction) => config.actions[action];

  const resolveSingleSuccessMessage = (
    action: TAction,
    targetLabel?: string
  ) => {
    const copy = getAction(action);
    if (copy.singleSuccessMessage) {
      return copy.singleSuccessMessage({
        labels: config.labels,
        targetLabel,
      });
    }
    return `${capitalize(config.labels.singular)}${formatTarget(targetLabel)} ${
      copy.pastTense
    }.`;
  };

  const resolveErrorMessage = (
    action: TAction,
    error: unknown,
    fallbackMessage?: string
  ) => {
    const copy = getAction(action);
    const fallback =
      fallbackMessage ??
      copy.errorFallback ??
      `Failed to ${copy.failureVerb} ${config.labels.singular}.`;
    return resolveListActionErrorMessage(error, fallback);
  };

  const summarizeBulkAction = <TTarget>(
    action: TAction,
    targets: TTarget[],
    results: PromiseSettledResult<unknown>[]
  ): ListBulkActionSummary<TAction, TTarget> => {
    const copy = getAction(action);
    const failedTargets = targets.filter(
      (_target, index) => results[index]?.status === "rejected"
    );
    const failedCount = failedTargets.length;
    const succeededCount = Math.max(0, targets.length - failedCount);
    const input = {
      count: targets.length,
      succeededCount,
      failedCount,
      labels: config.labels,
    };
    const ok = failedCount === 0;
    const toastMessage = ok
      ? copy.bulkSuccessMessage?.(input) ??
        `${targets.length} ${labelForCount(config.labels, targets.length)} ${
          copy.pastTense
        }.`
      : failedCount === targets.length
        ? copy.bulkFailureMessage?.(input) ??
          `Failed to ${copy.failureVerb} ${failedCount} ${labelForCount(
            config.labels,
            failedCount
          )}.`
        : copy.bulkPartialMessage?.(input) ??
          `${capitalize(copy.pastTense)} ${succeededCount} ${labelForCount(
            config.labels,
            succeededCount
          )}; failed ${failedCount}.`;
    return {
      ok,
      action,
      toastMessage,
      inlineMessage: toastMessage,
      succeededCount,
      failedCount,
      failedTargets,
    };
  };

  const emit = (
    message: string | ListBulkActionSummary<TAction, unknown>,
    variant?: ListActionToastVariant
  ) => {
    if (typeof message === "string") {
      if (variant === "error") {
        toast.error(message);
      } else {
        toast.success(message);
      }
      return message;
    }
    if (message.ok) {
      toast.success(message.toastMessage);
    } else {
      toast.error(message.toastMessage);
    }
    return message.toastMessage;
  };

  return {
    success(action: TAction, options?: { targetLabel?: string }) {
      return emit(resolveSingleSuccessMessage(action, options?.targetLabel), "success");
    },
    error(
      action: TAction,
      error: unknown,
      options?: { fallbackMessage?: string }
    ) {
      return emit(
        resolveErrorMessage(action, error, options?.fallbackMessage),
        "error"
      );
    },
    summarizeBulkAction,
    emitBulk(summary: ListBulkActionSummary<TAction, unknown>) {
      return emit(summary);
    },
  };
};
