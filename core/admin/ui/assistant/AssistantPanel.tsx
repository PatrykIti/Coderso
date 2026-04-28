import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  MessageCircleDashed,
  MessageSquareText,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  dryRunAssistantActions,
  executeAssistantActions,
  getAssistantStatus,
  planAssistantActions,
  sendAssistantMessage,
  type AssistantActionDryRunResponse,
  type AssistantActionExecuteResponse,
  type AssistantActionPlanResponse,
  type AssistantDetailLevel,
  type AssistantFollowUpOption,
  type AssistantGuideMode,
  type AssistantMode,
  type AssistantChatResponse,
  type AssistantStatusResponse,
} from "@/services/assistantClient";
import { getUserSettings } from "@/services/userSettingsClient";
import { useAdminAssistantConfig } from "@/ui/contexts/AdminAssistantConfigContext";
import { cn } from "@/lib/utils";

import { AssistantEmptyState } from "./AssistantEmptyState";
import { AssistantMessage } from "./AssistantMessage";
import { AssistantModeSwitch } from "./AssistantModeSwitch";
import { ActionExecutionResult } from "./components/ActionExecutionResult";
import { ActionPlanReview } from "./components/ActionPlanReview";
import { useAssistantAdminContext } from "./useAssistantAdminContext";
import {
  buildAssistantPlanningStateFromPlan,
  normalizeAssistantPlanningState,
} from "../../../services/assistant/cmsPlanningState";
import type { AssistantPlanningState } from "../../../services/assistant/actionPlanTypes";
import {
  readAssistantConversationState,
  writeAssistantConversationState,
} from "./assistantConversationState";

type AssistantEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sourceQuestion?: string;
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
const ASSISTANT_LAUNCHER_POSITION_KEY = "coderso.assistant.launcher.position";
const LEGACY_ASSISTANT_LAUNCHER_POSITION_KEY =
  "nextless.assistant.launcher.position";
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

const buildFollowUpQuestion = (
  baseQuestion: string,
  option: AssistantFollowUpOption
) => {
  const normalizedBase = baseQuestion.trim();
  if (!normalizedBase) return option.promptHint;
  return `${normalizedBase}\n\n${option.promptHint}`;
};

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
    const currentRaw = window.localStorage.getItem(ASSISTANT_LAUNCHER_POSITION_KEY);
    const legacyRaw = window.localStorage.getItem(
      LEGACY_ASSISTANT_LAUNCHER_POSITION_KEY
    );
    const raw = currentRaw ?? legacyRaw;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LauncherPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return fallback;
    }
    if (!currentRaw && legacyRaw) {
      window.localStorage.setItem(ASSISTANT_LAUNCHER_POSITION_KEY, legacyRaw);
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

type AssistantPanelProps = {
  activeHref?: string | null;
};

export function AssistantPanel({ activeHref = null }: AssistantPanelProps = {}) {
  const {
    enabled: launcherEnabled,
    launcherAvatarEnabled,
    launcherAvatarAsset,
  } = useAdminAssistantConfig();
  const cachedRuntimeState = readRuntimeStateCache(Date.now());
  const cachedConversationState = readAssistantConversationState();
  const [open, setOpen] = useState(false);
  const [isReady, setIsReady] = useState(() => cachedRuntimeState !== null);
  const [isLoadingRuntime, setIsLoadingRuntime] = useState(false);
  const [status, setStatus] = useState<AssistantStatusResponse | null>(
    () => cachedRuntimeState?.status ?? null
  );
  const [messages, setMessages] = useState<AssistantEntry[]>(() => cachedConversationState?.messages ?? []);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<AssistantMode | null>(() => cachedConversationState?.assistantMode ?? null);
  const [activePlan, setActivePlan] = useState<AssistantActionPlanResponse | null>(() => cachedConversationState?.activePlan ?? null);
  const [activePreview, setActivePreview] = useState<AssistantActionDryRunResponse | null>(
    () => cachedConversationState?.activePreview ?? null
  );
  const [activeExecution, setActiveExecution] =
    useState<AssistantActionExecuteResponse | null>(() => cachedConversationState?.activeExecution ?? null);
  const [planningState, setPlanningState] = useState<AssistantPlanningState | null>(() => cachedConversationState?.planningState ?? null);
  const [isPreviewingPlan, setIsPreviewingPlan] = useState(false);
  const [isExecutingPlan, setIsExecutingPlan] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition>(() =>
    readLauncherPosition()
  );
  const [conversationWidth, setConversationWidth] = useState(
    ASSISTANT_CONVERSATION_DEFAULT_WIDTH_PX
  );
  const suppressLauncherToggleRef = useRef(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const assistantAdminContext = useAssistantAdminContext({ activeHref });

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
    if (!open || !status) return;
    let active = true;
    getUserSettings()
      .then((settings) => {
        if (!active) return;
        setAssistantMode(
          settings["assistant.mode"] ?? status.defaultMode ?? "docs-only"
        );
      })
      .catch(() => {
        if (!active) return;
        setAssistantMode(status.defaultMode ?? "docs-only");
      });

    return () => {
      active = false;
    };
  }, [open, status]);

  useEffect(() => {
    writeAssistantConversationState({
      messages,
      activePlan,
      activePreview,
      activeExecution,
      planningState,
      assistantMode,
    });
  }, [activeExecution, activePlan, activePreview, assistantMode, messages, planningState]);

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

  const submitMessage = useCallback(
    async (input?: {
      message: string;
      sourceQuestion?: string;
      detailLevel?: AssistantDetailLevel;
      guideMode?: AssistantGuideMode;
    }) => {
      const outgoingMessage = (input?.message ?? message).trim();
      if (!outgoingMessage || isSending || !status) return;
      const currentMode = assistantMode ?? status.defaultMode;

      if (!input?.message) {
        setMessage("");
      }
      setActionError(null);
      setActivePlan(null);
      setActivePreview(null);
      setActiveExecution(null);
      const sourceQuestion = input?.sourceQuestion ?? outgoingMessage;
      const userEntry: AssistantEntry = {
        id: createEntryId(),
        role: "user",
        text: outgoingMessage,
        sourceQuestion,
      };
      setMessages((previous) => [...previous, userEntry]);
      setIsSending(true);

      try {
        if (currentMode === "llm-guide") {
          const plan = await planAssistantActions({
            prompt: outgoingMessage,
            context: {
              ...assistantAdminContext,
              includeResourceCatalog: true,
              planningState: normalizeAssistantPlanningState(planningState),
            },
          });

          setPlanningState(
            buildAssistantPlanningStateFromPlan(plan, {
              route: assistantAdminContext.page ?? null,
            })
          );
          if (plan.responseKind !== "docs") {
            setActivePlan(plan);
          }
          setMessages((previous) => [
            ...previous,
            {
              id: createEntryId(),
              role: "assistant",
              text: plan.answer,
              sourceQuestion,
            },
          ]);
        } else {
          const response = await sendAssistantMessage({
            message: outgoingMessage,
            mode: currentMode,
            detailLevel: input?.detailLevel,
            guideMode: input?.guideMode,
            context:
              typeof window === "undefined"
                ? undefined
                : {
                    page: assistantAdminContext.page,
                    locale: assistantAdminContext.locale,
                  },
          });

          setMessages((previous) => [
            ...previous,
            {
              id: createEntryId(),
              role: "assistant",
              text: response.answer,
              response,
              sourceQuestion,
            },
          ]);
        }
      } catch (error) {
        setMessages((previous) => [
          ...previous,
          {
            id: createEntryId(),
            role: "assistant",
            text: resolveApiError(error, "Assistant request failed."),
            sourceQuestion,
            error: "request_failed",
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [assistantAdminContext, assistantMode, isSending, message, planningState, status]
  );

  const handleFollowUpSelect = useCallback(
    (entry: AssistantEntry, option: AssistantFollowUpOption) => {
      if (isSending || !status) return;
      const baseQuestion = entry.sourceQuestion ?? "";
      const followUpMessage = buildFollowUpQuestion(baseQuestion, option);
      submitMessage({
        message: followUpMessage,
        sourceQuestion: baseQuestion || followUpMessage,
        detailLevel: option.detailLevel,
        guideMode: option.guideMode,
      }).catch(() => undefined);
    },
    [isSending, status, submitMessage]
  );

  const handleSendClick = useCallback(() => {
    submitMessage().catch(() => undefined);
  }, [submitMessage]);

  const handleDryRunPlan = useCallback(async () => {
    if (!activePlan || isPreviewingPlan || isExecutingPlan) return;
    setActionError(null);
    setIsPreviewingPlan(true);
    try {
      const preview = await dryRunAssistantActions({ plan: activePlan });
      setActivePreview(preview);
    } catch (error) {
      setActionError(resolveApiError(error, "Failed to preview assistant actions."));
    } finally {
      setIsPreviewingPlan(false);
    }
  }, [activePlan, isExecutingPlan, isPreviewingPlan]);

  const handleExecutePlan = useCallback(async () => {
    if (!activePlan || isExecutingPlan || isPreviewingPlan) return;
    setActionError(null);
    setIsExecutingPlan(true);
    try {
      const execution = await executeAssistantActions({
        plan: activePlan,
        idempotencyKey: crypto.randomUUID(),
      });
      setActivePreview(execution.preview);
      setActiveExecution(execution);
      setMessages((previous) => [
        ...previous,
        {
          id: createEntryId(),
          role: "assistant",
          text: `Guide actions executed. Created ${execution.summary.create}, updated ${execution.summary.update}, deleted ${execution.summary.delete ?? 0}, failed ${execution.summary.failed}, and left ${execution.summary.noop} item(s) unchanged.`,
        },
      ]);
    } catch (error) {
      setActionError(resolveApiError(error, "Failed to execute assistant actions."));
    } finally {
      setIsExecutingPlan(false);
    }
  }, [activePlan, isExecutingPlan, isPreviewingPlan]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setMessage("");
    setActivePlan(null);
    setActivePreview(null);
    setActiveExecution(null);
    setPlanningState(null);
    setActionError(null);
  }, []);

  const canSend = useMemo(
    () => Boolean(message.trim()) && !isSending && Boolean(status?.indexReady),
    [isSending, message, status?.indexReady]
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

  const currentMode = assistantMode ?? status?.defaultMode ?? "docs-only";
  const hasRestoredConversation =
    messages.length > 0 || Boolean(activePlan) || Boolean(activeExecution);
  const resolvedViewState = useMemo(
    () =>
      resolveAssistantPanelViewState({
        isReady: isReady || hasRestoredConversation,
        loadError,
        statusEnabled: status ? Boolean(status.enabled) : hasRestoredConversation,
      }),
    [hasRestoredConversation, isReady, loadError, status]
  );
  const resolvedConversationState = useMemo(
    () =>
      resolveAssistantConversationState({
        messageCount: messages.length,
        indexReady: status ? Boolean(status.indexReady) : hasRestoredConversation,
      }),
    [hasRestoredConversation, messages.length, status]
  );

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
            height: `${conversationWindowPosition.maxHeight}px`,
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
              Ask where settings live in docs or describe the setup you want `LLM Guide` to create.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
            {resolvedViewState === "loading" ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading assistant runtime...
                </div>
              </div>
            ) : null}

            {resolvedViewState === "error" ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Assistant is unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loadError ?? "Assistant runtime could not be loaded."}
                </p>
              </div>
            ) : null}

            {resolvedViewState === "disabled" ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Assistant is disabled</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enable the assistant in global settings to restore this conversation window.
                </p>
              </div>
            ) : null}

            {resolvedViewState === "ready" ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border bg-muted/10 p-3">
                  <div className="min-w-0 space-y-3 pr-3">
                    <AssistantModeSwitch llmAvailable={Boolean(status?.llmAvailable)} />

                    {resolvedConversationState === "empty" ? (
                      <AssistantEmptyState
                        disabled={isSending}
                        onPromptSelect={(prompt) => setMessage(prompt)}
                      />
                    ) : null}

                    {resolvedConversationState === "docs-not-ready" ? (
                      <div className="flex h-full flex-col justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-4 text-sm">
                        <p className="font-medium text-foreground">
                          Assistant docs are not ready yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reindex the assistant knowledge base in global settings before starting a conversation.
                        </p>
                      </div>
                    ) : null}

                    {resolvedConversationState === "messages"
                      ? messages.map((entry) => (
                          <AssistantMessage
                            key={entry.id}
                            role={entry.role}
                            text={entry.text}
                            response={entry.response}
                            error={entry.error}
                            onFollowUpSelect={(option) =>
                              handleFollowUpSelect(entry, option)
                            }
                          />
                        ))
                      : null}

                    {activePlan ? (
                      <ActionPlanReview
                        plan={activePlan}
                        preview={activePreview}
                        error={actionError}
                        isPreviewing={isPreviewingPlan}
                        isExecuting={isExecutingPlan}
                        onPreview={handleDryRunPlan}
                        onExecute={handleExecutePlan}
                      />
                    ) : null}

                    {activeExecution ? (
                      <ActionExecutionResult result={activeExecution} />
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 space-y-2 border-t pt-3">
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={
                      currentMode === "llm-guide"
                        ? "Describe the setup or admin surface you want LLM Guide to create..."
                        : "Ask where to find a feature in documentation..."
                    }
                    rows={4}
                    disabled={isSending || !status?.indexReady}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleNewConversation}
                      disabled={isSending || isPreviewingPlan || isExecutingPlan}
                    >
                      New
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendClick}
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
