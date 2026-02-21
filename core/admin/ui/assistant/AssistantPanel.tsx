import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Loader2, MessageSquareText, RefreshCw, Send } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  getAssistantStatus,
  sendAssistantMessage,
  type AssistantChatResponse,
  type AssistantMode,
  type AssistantStatusResponse,
} from "@/services/assistantClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";

import { AssistantEmptyState } from "./AssistantEmptyState";
import { AssistantAvatar } from "./AssistantAvatar";
import { AssistantMessage } from "./AssistantMessage";
import { AssistantModeSwitch } from "./AssistantModeSwitch";
import type { AssistantAvatarState } from "./avatarStates";

type AssistantEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: AssistantChatResponse;
  error?: string;
};

const createEntryId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const resolveApiError = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const normalizeMode = (
  preferred: AssistantMode,
  status: AssistantStatusResponse
): AssistantMode => {
  if (preferred === "llm-rag" && !status.llmAvailable) return "docs-only";
  return preferred;
};

type AssistantRuntimeState = {
  status: AssistantStatusResponse;
  mode: AssistantMode;
  isEnabled: boolean;
  avatarEnabled: boolean;
  avatarAsset: string;
};

const ASSISTANT_RUNTIME_CACHE_TTL_MS = 60_000;

let runtimeStateCache:
  | {
      value: AssistantRuntimeState;
      savedAt: number;
    }
  | null = null;
let runtimeStatePromise: Promise<AssistantRuntimeState> | null = null;

const readRuntimeStateCache = (nowMs: number) => {
  if (!runtimeStateCache) return null;
  if (nowMs - runtimeStateCache.savedAt > ASSISTANT_RUNTIME_CACHE_TTL_MS) {
    return null;
  }
  return runtimeStateCache.value;
};

const buildRuntimeState = (
  assistantStatus: AssistantStatusResponse,
  userSettings: Awaited<ReturnType<typeof getUserSettings>>
): AssistantRuntimeState => {
  const userEnabled = userSettings["assistant.ui.enabled"];
  const preferredMode = userSettings["assistant.mode"] ?? assistantStatus.defaultMode;
  const preferredAvatarEnabled = userSettings["assistant.ui.avatarEnabled"] ?? false;
  const preferredAvatarAsset = userSettings["assistant.ui.avatarAsset"] ?? null;

  return {
    status: assistantStatus,
    mode: normalizeMode(preferredMode, assistantStatus),
    isEnabled: Boolean(assistantStatus.enabled) && Boolean(userEnabled),
    avatarEnabled: preferredAvatarEnabled,
    avatarAsset: preferredAvatarAsset ?? "",
  };
};

export const clearAssistantRuntimeStateCache = () => {
  runtimeStateCache = null;
  runtimeStatePromise = null;
};

export async function loadAssistantRuntimeStateCached(options?: {
  force?: boolean;
  now?: () => number;
}) {
  const force = options?.force ?? false;
  const now = options?.now ?? (() => Date.now());

  if (!force) {
    const cached = readRuntimeStateCache(now());
    if (cached) return cached;
  }

  if (runtimeStatePromise) {
    return runtimeStatePromise;
  }

  const request = Promise.all([
    getAssistantStatus({ force }),
    getUserSettings({ force }),
  ])
    .then(([assistantStatus, userSettings]) =>
      buildRuntimeState(assistantStatus, userSettings)
    )
    .then((nextState) => {
      runtimeStateCache = {
        value: nextState,
        savedAt: now(),
      };
      return nextState;
    })
    .finally(() => {
      runtimeStatePromise = null;
    });

  runtimeStatePromise = request;
  return request;
}

export const shouldLoadAssistantRuntimeState = (input: {
  open: boolean;
  isReady: boolean;
  isLoading: boolean;
}) => input.open && !input.isReady && !input.isLoading;

export function AssistantPanel() {
  const cachedRuntimeState = readRuntimeStateCache(Date.now());
  const [open, setOpen] = useState(false);
  const [isReady, setIsReady] = useState(() => cachedRuntimeState !== null);
  const [isLoadingRuntime, setIsLoadingRuntime] = useState(false);
  const [isEnabled, setIsEnabled] = useState(
    () => cachedRuntimeState?.isEnabled ?? true
  );
  const [status, setStatus] = useState<AssistantStatusResponse | null>(
    () => cachedRuntimeState?.status ?? null
  );
  const [mode, setMode] = useState<AssistantMode>(
    () => cachedRuntimeState?.mode ?? "docs-only"
  );
  const [messages, setMessages] = useState<AssistantEntry[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarEnabled, setAvatarEnabled] = useState(
    () => cachedRuntimeState?.avatarEnabled ?? false
  );
  const [avatarAssetDraft, setAvatarAssetDraft] = useState(
    () => cachedRuntimeState?.avatarAsset ?? ""
  );
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const applyRuntimeState = useCallback((nextState: AssistantRuntimeState) => {
    setStatus(nextState.status);
    setMode(nextState.mode);
    setAvatarEnabled(nextState.avatarEnabled);
    setAvatarAssetDraft(nextState.avatarAsset);
    setIsEnabled(nextState.isEnabled);
  }, []);

  const loadRuntimeState = useCallback(async (options?: { force?: boolean }) => {
    setLoadError(null);
    setIsLoadingRuntime(true);
    try {
      const runtimeState = await loadAssistantRuntimeStateCached({
        force: options?.force,
      });
      applyRuntimeState(runtimeState);
    } catch (error) {
      setIsEnabled(false);
      setLoadError(resolveApiError(error, "Failed to load assistant status."));
    } finally {
      setIsReady(true);
      setIsLoadingRuntime(false);
    }
  }, [applyRuntimeState]);

  useEffect(() => {
    if (
      !shouldLoadAssistantRuntimeState({
        open,
        isReady,
        isLoading: isLoadingRuntime,
      })
    ) {
      return;
    }
    loadRuntimeState().catch(() => undefined);
  }, [isLoadingRuntime, isReady, loadRuntimeState, open]);

  const submitMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending || !status) return;

    setMessage("");
    const userEntry: AssistantEntry = {
      id: createEntryId(),
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userEntry]);
    setIsSending(true);

    try {
      const response = await sendAssistantMessage({
        message: trimmed,
        mode,
        context:
          typeof window === "undefined"
            ? undefined
            : {
                page: window.location.pathname,
                locale:
                  typeof navigator !== "undefined" ? navigator.language : undefined,
              },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: createEntryId(),
          role: "assistant",
          text: response.answer,
          response,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: createEntryId(),
          role: "assistant",
          text: resolveApiError(error, "Assistant request failed."),
          error: "request_failed",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [isSending, message, mode, status]);

  const handleModeChange = useCallback(
    async (nextMode: AssistantMode) => {
      if (!status) return;
      const normalized = normalizeMode(nextMode, status);
      setMode(normalized);
      try {
        await setUserSetting("assistant.mode", normalized);
      } catch {
        // Mode persistence failure should not block local mode change.
      }
    },
    [status]
  );

  const handleAvatarEnabledChange = useCallback(
    async (next: boolean) => {
      setAvatarEnabled(next);
      setIsSavingAvatar(true);
      try {
        await setUserSetting("assistant.ui.avatarEnabled", next);
      } catch {
        // Avatar toggle persistence failure should not block chat usage.
      } finally {
        setIsSavingAvatar(false);
      }
    },
    []
  );

  const persistAvatarAsset = useCallback(async () => {
    const normalized = avatarAssetDraft.trim();
    setIsSavingAvatar(true);
    try {
      await setUserSetting(
        "assistant.ui.avatarAsset",
        normalized.length > 0 ? normalized : null
      );
    } catch {
      // Avatar asset persistence failure should not block chat usage.
    } finally {
      setIsSavingAvatar(false);
    }
  }, [avatarAssetDraft]);

  const avatarState: AssistantAvatarState = useMemo(() => {
    if (isSending) return "thinking";
    const latestAssistantMessage = [...messages]
      .reverse()
      .find((entry) => entry.role === "assistant" && !entry.error);
    if (latestAssistantMessage) return "answer";
    return "idle";
  }, [isSending, messages]);

  const canSend = useMemo(
    () =>
      Boolean(message.trim()) &&
      !isSending &&
      Boolean(status?.indexReady) &&
      isEnabled,
    [isEnabled, isSending, message, status?.indexReady]
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        {isLoadingRuntime && !isReady ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        Assistant
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4" />
              Assistant
            </SheetTitle>
            <SheetDescription>
              Ask where settings, widgets, and flows are documented.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 min-h-0 flex-col gap-4 px-4 py-4">
            {!isReady ? (
              <div className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading assistant runtime...
              </div>
            ) : null}

            {loadError ? (
              <Alert variant="destructive" className="py-2">
                <AlertTitle className="text-xs">Assistant unavailable</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                  <span>{loadError}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => void loadRuntimeState({ force: true })}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {isReady && !isEnabled && !loadError ? (
              <Alert className="py-2">
                <AlertTitle className="text-xs">Assistant is disabled</AlertTitle>
                <AlertDescription className="text-xs">
                  Enable it from your assistant preferences to start a conversation.
                </AlertDescription>
              </Alert>
            ) : null}

            {status ? (
              <>
                <AssistantModeSwitch
                  value={mode}
                  llmAvailable={status.llmAvailable}
                  onChange={handleModeChange}
                  disabled={isSending}
                />
                <div className="space-y-3 rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Avatar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Optional visual layer for assistant responses.
                      </p>
                    </div>
                    <Switch
                      checked={avatarEnabled}
                      onCheckedChange={(checked) =>
                        void handleAvatarEnabledChange(Boolean(checked))
                      }
                      disabled={isSavingAvatar}
                      aria-label="Toggle assistant avatar"
                    />
                  </div>
                  <Input
                    value={avatarAssetDraft}
                    onChange={(event) => setAvatarAssetDraft(event.target.value)}
                    onBlur={() => void persistAvatarAsset()}
                    placeholder="Avatar asset URL (image/video/glb)"
                    disabled={!avatarEnabled || isSavingAvatar}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use media URL or external URL. Leave empty for built-in fallback.
                  </p>
                </div>
                <AssistantAvatar
                  enabled={avatarEnabled}
                  assetUrl={avatarAssetDraft}
                  state={avatarState}
                />
                {!status.indexReady ? (
                  <Alert className="py-2">
                    <AlertTitle className="text-xs">Docs index not ready</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                      <span>Run assistant reindex before sending questions.</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => void loadRuntimeState({ force: true })}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Refresh
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : null}

            <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-muted/10 p-3">
              <div className="space-y-3 pr-3">
                {messages.length === 0 ? (
                  <AssistantEmptyState
                    disabled={isSending}
                    onPromptSelect={(prompt) => setMessage(prompt)}
                  />
                ) : (
                  messages.map((entry) => (
                    <AssistantMessage
                      key={entry.id}
                      role={entry.role}
                      text={entry.text}
                      response={entry.response}
                      error={entry.error}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask where to find a feature in documentation..."
                rows={4}
                disabled={isSending || !status?.indexReady || !isEnabled}
              />
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={submitMessage} disabled={!canSend}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
