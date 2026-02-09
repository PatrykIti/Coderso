import { useMemo } from "react";
import { Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  assistantAvatarStateMap,
  type AssistantAvatarState,
} from "./avatarStates";

type AssistantAvatarProps = {
  enabled: boolean;
  assetUrl: string | null;
  state: AssistantAvatarState;
};

type AvatarAssetKind = "none" | "glb" | "image" | "video" | "unknown";

const normalizeAssetUrl = (value: string | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveAssetKind = (assetUrl: string | null): AvatarAssetKind => {
  if (!assetUrl) return "none";
  const normalized = assetUrl.toLowerCase();
  if (normalized.endsWith(".glb") || normalized.endsWith(".gltf")) return "glb";
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)$/.test(normalized)) return "image";
  if (/(\.mp4|\.webm|\.ogg)$/.test(normalized)) return "video";
  return "unknown";
};

const supportsWebGl = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.WebGLRenderingContext);
};

const avatarKindLabel: Record<AvatarAssetKind, string> = {
  none: "Placeholder",
  glb: "3D asset",
  image: "Image",
  video: "Video",
  unknown: "External",
};

export function AssistantAvatar({ enabled, assetUrl, state }: AssistantAvatarProps) {
  const stateMeta = assistantAvatarStateMap[state];
  const normalizedAssetUrl = normalizeAssetUrl(assetUrl);
  const assetKind = resolveAssetKind(normalizedAssetUrl);
  const webGlReady = useMemo(() => supportsWebGl(), []);

  if (!enabled) return null;

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assistant avatar
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{avatarKindLabel[assetKind]}</Badge>
          <Badge variant="secondary">{stateMeta.label}</Badge>
        </div>
      </div>

      <div
        className={cn(
          "relative flex h-36 items-center justify-center overflow-hidden rounded-lg ring-1",
          stateMeta.ringClassName
        )}
      >
        <div className={cn("absolute inset-0", stateMeta.glowClassName)} />

        {assetKind === "image" && normalizedAssetUrl ? (
          <img
            src={normalizedAssetUrl}
            alt="Assistant avatar"
            className="relative z-10 h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}

        {assetKind === "video" && normalizedAssetUrl ? (
          <video
            src={normalizedAssetUrl}
            className="relative z-10 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : null}

        {(assetKind === "none" || assetKind === "unknown" || assetKind === "glb") && (
          <div className="relative z-10 flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-background/85 p-3 shadow-sm">
              <Bot className="h-6 w-6" />
            </div>
            {assetKind === "glb" ? (
              <p className="max-w-[16rem] text-xs text-muted-foreground">
                3D avatar asset configured. {webGlReady ? "Renderer fallback is active." : "WebGL unavailable, using 2D fallback."}
              </p>
            ) : (
              <p className="max-w-[16rem] text-xs text-muted-foreground">
                Optional avatar can use image, video, or glb asset URL.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
