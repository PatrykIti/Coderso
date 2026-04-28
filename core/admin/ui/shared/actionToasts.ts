import { toast } from "sonner";

export type AdminActionToastCopy = {
  success: string;
  errorFallback: string;
};

export type AdminActionToastConfig<TAction extends string> = {
  actions: Record<TAction, AdminActionToastCopy>;
};

export const resolveAdminActionErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim() &&
    ((error as { name?: unknown }).name === "ApiClientError" ||
      "status" in error ||
      "code" in error)
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

export const createAdminActionToastAdapter = <TAction extends string>(
  config: AdminActionToastConfig<TAction>
) => {
  const getAction = (action: TAction) => config.actions[action];

  return {
    success(action: TAction) {
      const message = getAction(action).success;
      toast.success(message);
      return message;
    },
    error(
      action: TAction,
      error: unknown,
      options?: { fallbackMessage?: string }
    ) {
      const copy = getAction(action);
      const message = resolveAdminActionErrorMessage(
        error,
        options?.fallbackMessage ?? copy.errorFallback
      );
      toast.error(message);
      return message;
    },
  };
};
