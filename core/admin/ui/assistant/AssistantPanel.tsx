import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  MessageCircleDashed,
  MessageSquareText,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  getAssistantStatus,
  sendAssistantMessage,
  type AssistantChatResponse,
  type AssistantStatusResponse,
} from "@/services/assistantClient";
import { useAdminAssistantConfig } from "@/ui/contexts/AdminAssistantConfigContext";
import { cn } from "@/lib/utils";

import { AssistantEmptyState } from "./AssistantEmptyState";
import { AssistantMessage } from "./AssistantMessage";

type AssistantEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: AssistantChatResponse;
  error?: string;
};

type AssistantRuntimeState = {
  status: AssistantStatusResponse;
};

type LauncherPosition = {
  x: number;
  y: number;
};

type LauncherAssetKind = "none" | "image" | "video" | "other";
type ConversationWindowPosition = {
  left: number;
  bottom: number;
  width: number;
  maxHeight: number;
};

export type AssistantPanelViewState = "loading" | "error" | "disabled" | "ready";

export type AssistantConversationState = "empty" | "messages" | "docs-not-ready";

const ASSISTANT_RUNTIME_CACHE_TTL_MS = 60_000;
const ASSISTANT_LAUNCHER_POSITION_KEY = "nextless.assistant.launcher.position";
const ASSISTANT_LAUNCHER_SIZE_PX = 56;
const ASSISTANT_LAUNCHER_MARGIN_PX = 24;
const ASSISTANT_CONVERSATION_DEFAULT_WIDTH_PX = 380;
const ASSISTANT_CONVERSATION_MIN_WIDTH_PX = 320;
const ASSISTANT_CONVERSATION_MAX_WIDTH_PX = 520;
const ASSISTANT_CONVERSATION_GAP_PX = 12;

let runtimeStateCache:
  | {
      value: AssistantRuntimeState;
      savedAt: number;
    }
  | null = null;
let runtimeStatePromise: Promise<AssistantRuntimeState> | null = null;

const createEntryId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const resolveApiError = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const readRuntimeStateCache = (nowMs: number) => {
  if (!runtimeStateCache) return null;
  if (nowMs - runtimeStateCache.savedAt > ASSISTANT_RUNTIME_CACHE_TTL_MS) {
    return null;
  }
  return runtimeStateCache.value;
};

const getViewportSize = () => {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const clampLauncherPosition = (
  position: LauncherPosition,
  viewportWidth: number,
  viewportHeight: number
): LauncherPosition => {
  const maxX = Math.max(
    ASSISTANT_LAUNCHER_MARGIN_PX,
    viewportWidth - ASSISTANT_LAUNCHER_SIZE_PX - ASSISTANT_LAUNCHER_MARGIN_PX
  );
  const maxY = Math.max(
    ASSISTANT_LAUNCHER_MARGIN_PX,
    viewportHeight - ASSISTANT_LAUNCHER_SIZE_PX - ASSISTANT_LAUNCHER_MARGIN_PX
  );

  return {
    x: Math.min(maxX, Math.max(ASSISTANT_LAUNCHER_MARGIN_PX, position.x)),
    y: Math.min(maxY, Math.max(ASSISTANT_LAUNCHER_MARGIN_PX, position.y)),
  };
};

const getDefaultLauncherPosition = (): LauncherPosition => {
  const { width, height } = getViewportSize();
  return clampLauncherPosition(
    {
      x: width - ASSISTANT_LAUNCHER_SIZE_PX - ASSISTANT_LAUNCHER_MARGIN_PX,
      y: height - ASSISTANT_LAUNCHER_SIZE_PX - ASSISTANT_LAUNCHER_MARGIN_PX,
    },
    width,
    height
  );
};

const readLauncherPosition = (): LauncherPosition => {
  const fallback = getDefaultLauncherPosition();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(ASSISTANT_LAUNCHER_POSITION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LauncherPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return fallback;
    }
    const { width, height } = getViewportSize();
    return clampLauncherPosition({ x: parsed.x, y: parsed.y }, width, height);
  } catch {
    return fallback;
  }
};

const persistLauncherPosition = (position: LauncherPosition) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ASSISTANT_LAUNCHER_POSITION_KEY,
    JSON.stringify(position)
  );
};

const resolveLauncherAssetKind = (assetUrl: string | null): LauncherAssetKind => {
  if (!assetUrl) return "none";
  const normalized = assetUrl.toLowerCase();
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)$/.test(normalized)) return "image";
  if (/(\.mp4|\.webm|\.ogg)$/.test(normalized)) return "video";
  return "other";
};

const clampConversationWidth = (width: number, viewportWidth: number) => {
  const maxViewportWidth = viewportWidth - ASSISTANT_LAUNCHER_MARGIN_PX * 2;
  return Math.min(
    Math.max(ASSISTANT_CONVERSATION_MIN_WIDTH_PX, Math.floor(width)),
    Math.min(ASSISTANT_CONVERSATION_MAX_WIDTH_PX, maxViewportWidth)
  );
};

export const resolveAssistantConversationWindowPosition = (input: {
  launcherPosition: LauncherPosition;
  viewportWidth: number;
  viewportHeight: number;
  preferredWidth?: number;
}): ConversationWindowPosition => {
  const width = clampConversationWidth(
    input.preferredWidth ?? ASSISTANT_CONVERSATION_DEFAULT_WIDTH_PX,
    input.viewportWidth
  );
  const maxLeft = Math.max(
    ASSISTANT_LAUNCHER_MARGIN_PX,
    input.viewportWidth - width - ASSISTANT_LAUNCHER_MARGIN_PX
  );
  const left = Math.min(
    maxLeft,
    Math.max(
      ASSISTANT_LAUNCHER_MARGIN_PX,
      input.launcherPosition.x + ASSISTANT_LAUNCHER_SIZE_PX - width
    )
  );

  return {
    left,
    bottom: Math.max(
      ASSISTANT_LAUNCHER_MARGIN_PX,
      input.viewportHeight - input.launcherPosition.y + ASSISTANT_CONVERSATION_GAP_PX
    ),
    width,
    maxHeight: Math.min(
      560,
      Math.max(320, input.viewportHeight - ASSISTANT_LAUNCHER_MARGIN_PX * 2)
    ),
  };
};

const buildRuntimeState = (
  assistantStatus: AssistantStatusResponse
): AssistantRuntimeState => ({
  status: assistantStatus,
});

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

  const request = getAssistantStatus({ force })
    .then((assistantStatus) => buildRuntimeState(assistantStatus))
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

export const resolveAssistantPanelViewState = (input: {
  isReady: boolean;
  loadError: string | null;
  statusEnabled: boolean;
}): AssistantPanelViewState => {
  if (!input.isReady) return "loading";
  if (input.loadError) return "error";
  if (!input.statusEnabled) return "disabled";
  return "ready";
};

export const resolveAssistantConversationState = (input: {
  messageCount: number;
  indexReady: boolean;
}): AssistantConversationState => {
  if (input.messageCount > 0) return "messages";
  if (!input.indexReady) return "docs-not-ready";
  return "empty";
};

export function AssistantPanel() {
  const {
    enabled: launcherEnabled,
    launcherAvatarEnabled,
    launcherAvatarAsset,
  } = useAdminAssistantConfig();
  const cachedRuntimeState = readRuntimeStateCache(Date.now());
  const [open, setOpen] = useState(false);
  const [isReady, setIsReady] = useState(() => cachedRuntimeState !== null);
  const [isLoadingRuntime, setIsLoadingRuntime] = useState(false);
  const [status, setStatus] = useState<AssistantStatusResponse | null>(
    () => cachedRuntimeState?.status ?? null
  );
  const [messages, setMessages] = useState<AssistantEntry[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition>(() =>
    readLauncherPosition()
  );
  const [conversationWidth, setConversationWidth] = useState(
    ASSISTANT_CONVERSATION_DEFAULT_WIDTH_PX
  );
  const suppressLauncherToggleRef = useRef(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const launcherAsset =
    launcherAvatarEnabled && typeof launcherAvatarAsset === "string"
      ? launcherAvatarAsset.trim() || null
      : null;
  const launcherAssetKind = resolveLauncherAssetKind(launcherAsset);

  const applyRuntimeState = useCallback((nextState: AssistantRuntimeState) => {
    setStatus(nextState.status);
  }, []);

  const loadRuntimeState = useCallback(
    async (options?: { force?: boolean }) => {
      setLoadError(null);
      setIsLoadingRuntime(true);
      try {
        const runtimeState = await loadAssistantRuntimeStateCached({
          force: options?.force,
        });
        applyRuntimeState(runtimeState);
      } catch (error) {
        setStatus(null);
        setLoadError(resolveApiError(error, "Failed to load assistant status."));
      } finally {
        setIsReady(true);
        setIsLoadingRuntime(false);
      }
    },
    [applyRuntimeState]
  );

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

  useEffect(() => {
    const handleResize = () => {
      const { width, height } = getViewportSize();
      setLauncherPosition((previous) =>
        clampLauncherPosition(previous, width, height)
      );
    };

    if (typeof window === "undefined") return undefined;
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    persistLauncherPosition(launcherPosition);
  }, [launcherPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (conversationRef.current?.contains(target)) return;
      if (launcherRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLauncherClick = useCallback(() => {
    if (suppressLauncherToggleRef.current) return;
    setOpen(true);
  }, []);

  const handleLauncherPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;

      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = launcherPosition;
      let moved = false;

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
          moved = true;
        }
        const { width, height } = getViewportSize();
        setLauncherPosition(
          clampLauncherPosition(
            {
              x: origin.x + deltaX,
              y: origin.y + deltaY,
            },
            width,
            height
          )
        );
      };

      const handleStop = (stopEvent: PointerEvent) => {
        if (stopEvent.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleStop);
        window.removeEventListener("pointercancel", handleStop);
        if (moved) {
          suppressLauncherToggleRef.current = true;
          window.setTimeout(() => {
            suppressLauncherToggleRef.current = false;
          }, 0);
        }
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleStop);
      window.addEventListener("pointercancel", handleStop);
    },
    [launcherPosition]
  );

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();

      const pointerId = event.pointerId;
      const startX = event.clientX;
      const originWidth = conversationWidth;

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const deltaX = startX - moveEvent.clientX;
        const { width } = getViewportSize();
        setConversationWidth(
          clampConversationWidth(originWidth + deltaX, width)
        );
      };

      const handleStop = (stopEvent: PointerEvent) => {
        if (stopEvent.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleStop);
        window.removeEventListener("pointercancel", handleStop);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleStop);
      window.addEventListener("pointercancel", handleStop);
    },
    [conversationWidth]
  );

  const submitMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending || !status) return;

    setMessage("");
    const userEntry: AssistantEntry = {
      id: createEntryId(),
      role: "user",
      text: trimmed,
    };
    setMessages((previous) => [...previous, userEntry]);
    setIsSending(true);

    try {
      const response = await sendAssistantMessage({
        message: trimmed,
        mode: status.defaultMode,
        context:
          typeof window === "undefined"
            ? undefined
            : {
                page: window.location.pathname,
                locale:
                  typeof navigator !== "undefined" ? navigator.language : undefined,
              },
      });

      setMessages((previous) => [
        ...previous,
        {
          id: createEntryId(),
          role: "assistant",
          text: response.answer,
          response,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
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
  }, [isSending, message, status]);

  const canSend = useMemo(
    () => Boolean(message.trim()) && !isSending && Boolean(status?.indexReady),
    [isSending, message, status?.indexReady]
  );

  const viewState = useMemo(
    () =>
      resolveAssistantPanelViewState({
        isReady,
        loadError,
        statusEnabled: Boolean(status?.enabled),
      }),
    [isReady, loadError, status?.enabled]
  );

  const conversationState = useMemo(
    () =>
      resolveAssistantConversationState({
        messageCount: messages.length,
        indexReady: Boolean(status?.indexReady),
      }),
    [messages.length, status?.indexReady]
  );

  const conversationWindowPosition = useMemo(() => {
    const { width, height } = getViewportSize();
    return resolveAssistantConversationWindowPosition({
      launcherPosition,
      viewportWidth: width,
      viewportHeight: height,
      preferredWidth: conversationWidth,
    });
  }, [conversationWidth, launcherPosition]);

  if (!launcherEnabled) {
    return null;
  }

  return (
    <>
      <Button
        ref={launcherRef}
        type="button"
        size="icon"
        className={cn(
          "fixed z-40 h-14 w-14 rounded-full border shadow-lg backdrop-blur transition-colors",
          "border-emerald-700/80 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white",
          open && "bg-emerald-700 ring-4 ring-emerald-500/20",
          "cursor-grab active:cursor-grabbing"
        )}
        style={{
          left: `${launcherPosition.x}px`,
          top: `${launcherPosition.y}px`,
          touchAction: "none",
        }}
        onPointerDown={handleLauncherPointerDown}
        onClick={handleLauncherClick}
        aria-label="Open assistant conversation"
      >
        {launcherAssetKind === "image" && launcherAsset ? (
          <img
            src={launcherAsset}
            alt=""
            aria-hidden="true"
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
          />
        ) : null}

        {launcherAssetKind === "video" && launcherAsset ? (
          <video
            src={launcherAsset}
            className="h-full w-full rounded-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        ) : null}

        {launcherAssetKind === "none" || launcherAssetKind === "other" ? (
          isLoadingRuntime && !isReady ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircleDashed className="h-6 w-6" />
          )
        ) : null}
      </Button>

      {open ? (
        <div
          ref={conversationRef}
          className={cn(
            "fixed z-40 flex min-w-0 flex-col overflow-hidden overscroll-contain rounded-2xl border border-border bg-background shadow-2xl",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          style={{
            left: `${conversationWindowPosition.left}px`,
            bottom: `${conversationWindowPosition.bottom}px`,
            width: `${conversationWindowPosition.width}px`,
            maxHeight: `${conversationWindowPosition.maxHeight}px`,
            transformOrigin: "bottom right",
          }}
          role="dialog"
          aria-label="Assistant conversation"
        >
          <div
            className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize"
            onPointerDown={handleResizePointerDown}
            aria-hidden="true"
          />
          <div className="border-b px-4 py-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-emerald-700" />
              <p className="font-semibold text-foreground">Assistant</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask where settings, widgets, and flows are documented.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
            {viewState === "loading" ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading assistant runtime...
                </div>
              </div>
            ) : null}

            {viewState === "error" ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Assistant is unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loadError ?? "Assistant runtime could not be loaded."}
                </p>
              </div>
            ) : null}

            {viewState === "disabled" ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Assistant is disabled</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enable the assistant in global settings to restore this conversation window.
                </p>
              </div>
            ) : null}

            {viewState === "ready" ? (
              <>
                <ScrollArea className="min-h-0 flex-1 overflow-hidden overscroll-contain rounded-xl border bg-muted/10 p-3">
                  <div className="min-w-0 space-y-3 pr-3">
                    {conversationState === "empty" ? (
                      <AssistantEmptyState
                        disabled={isSending}
                        onPromptSelect={(prompt) => setMessage(prompt)}
                      />
                    ) : null}

                    {conversationState === "docs-not-ready" ? (
                      <div className="flex h-full flex-col justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-4 text-sm">
                        <p className="font-medium text-foreground">
                          Assistant docs are not ready yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reindex the assistant knowledge base in global settings before starting a conversation.
                        </p>
                      </div>
                    ) : null}

                    {conversationState === "messages"
                      ? messages.map((entry) => (
                          <AssistantMessage
                            key={entry.id}
                            role={entry.role}
                            text={entry.text}
                            response={entry.response}
                            error={entry.error}
                          />
                        ))
                      : null}
                  </div>
                </ScrollArea>

                <div className="shrink-0 space-y-2 border-t pt-3">
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask where to find a feature in documentation..."
                    rows={4}
                    disabled={isSending || !status?.indexReady}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={submitMessage}
                      disabled={!canSend}
                    >
                      {isSending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
