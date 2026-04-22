import { useEffect, useMemo, useState } from "react";
import { Monitor, Smartphone, Tablet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const runtimePreviewDevices = [
  { id: "desktop", label: "Desktop", width: 1200, height: 760, icon: Monitor },
  { id: "tablet", label: "Tablet", width: 820, height: 720, icon: Tablet },
  { id: "mobile", label: "Mobile", width: 390, height: 720, icon: Smartphone },
] as const;

export type RuntimePreviewDeviceId = (typeof runtimePreviewDevices)[number]["id"];

type PreviewLoadError = "loopback_unreachable" | "timeout" | null;

const isAbsoluteUrl = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);

const withPreviewDevice = (previewUrl: string, device: RuntimePreviewDeviceId) => {
  try {
    const resolved = new URL(previewUrl, "http://localhost");
    resolved.searchParams.set("device", device);
    return isAbsoluteUrl(previewUrl)
      ? resolved.toString()
      : `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return previewUrl;
  }
};

const getPreviewTargetLabel = (previewUrl: string) => {
  try {
    const resolved = new URL(previewUrl, "http://localhost");
    resolved.searchParams.delete("token");
    resolved.searchParams.delete("device");
    return isAbsoluteUrl(previewUrl) ? resolved.origin : resolved.pathname || "/preview";
  } catch {
    return previewUrl.replace(/([?&]token=)[^&]+/, "$1<redacted>");
  }
};

const getPreviewOrigin = (previewUrl: string) => {
  if (!isAbsoluteUrl(previewUrl)) return null;
  try {
    return new URL(previewUrl).origin;
  } catch {
    return null;
  }
};

const isLoopbackHost = (previewUrl: string) => {
  if (!isAbsoluteUrl(previewUrl)) return false;
  try {
    const hostname = new URL(previewUrl).hostname;
    return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname);
  } catch {
    return false;
  }
};

export type RuntimePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  canPreview: boolean;
  previewUrl: string | null;
  isLoading: boolean;
  error: string | null;
  showEmpty?: boolean;
  emptyMessage?: string;
  cannotPreviewMessage?: string;
  unavailableMessage?: string;
  iframeTitle?: string;
  device?: RuntimePreviewDeviceId;
  onDeviceChange?: (device: RuntimePreviewDeviceId) => void;
  onFixPreviewTarget?: () => void;
  fixPreviewTargetLabel?: string;
};

export function RuntimePreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  canPreview,
  previewUrl,
  isLoading,
  error,
  showEmpty = false,
  emptyMessage = "Nothing to preview yet.",
  cannotPreviewMessage = "Save this resource to generate a runtime preview.",
  unavailableMessage = "Preview data is not available yet.",
  iframeTitle = "Runtime preview",
  device,
  onDeviceChange,
  onFixPreviewTarget,
  fixPreviewTargetLabel = "Open settings",
}: RuntimePreviewDialogProps) {
  const [internalDevice, setInternalDevice] = useState<RuntimePreviewDeviceId>("desktop");
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<PreviewLoadError>(null);

  const resolvedDevice = device ?? internalDevice;

  const handleDeviceChange = (nextDevice: RuntimePreviewDeviceId) => {
    if (onDeviceChange) {
      onDeviceChange(nextDevice);
    } else {
      setInternalDevice(nextDevice);
    }
  };

  const viewport = useMemo(
    () =>
      runtimePreviewDevices.find((entry) => entry.id === resolvedDevice) ??
      runtimePreviewDevices[0],
    [resolvedDevice]
  );
  const iframeSrc = useMemo(
    () => (previewUrl ? withPreviewDevice(previewUrl, resolvedDevice) : null),
    [resolvedDevice, previewUrl]
  );
  const iframeKey = iframeSrc ?? previewUrl ?? "runtime-preview";
  const iframeReady = loadedSrc === iframeKey;
  const previewTargetLabel = useMemo(
    () => (previewUrl ? getPreviewTargetLabel(previewUrl) : null),
    [previewUrl]
  );
  const previewOrigin = useMemo(
    () => (previewUrl ? getPreviewOrigin(previewUrl) : null),
    [previewUrl]
  );
  const previewUsesLoopback = useMemo(
    () => (previewUrl ? isLoopbackHost(previewUrl) : false),
    [previewUrl]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => {
      setLoadedSrc(null);
      setLoadError(null);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [iframeKey, open]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !open ||
      !previewUrl ||
      isLoading ||
      !previewUsesLoopback ||
      !previewOrigin
    ) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1500);
    let active = true;

    window
      .fetch(previewOrigin, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal,
      })
      .catch(() => {
        if (active) {
          setLoadError("loopback_unreachable");
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, open, previewOrigin, previewUrl, previewUsesLoopback]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !open ||
      !previewUrl ||
      isLoading ||
      loadError ||
      iframeReady
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoadError("timeout");
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [iframeReady, isLoading, loadError, open, previewUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b px-6 py-4">
          <div className="space-y-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {subtitle ?? "Runtime preview (read-only, site theme)."}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {runtimePreviewDevices.map((entry) => {
                const isActive = entry.id === resolvedDevice;
                const Icon = entry.icon;
                return (
                  <Button
                    key={entry.id}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => handleDeviceChange(entry.id)}
                    className={cn(isActive && "shadow-sm")}
                    aria-label={entry.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 px-6 py-6">
          {isLoading ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              Rendering runtime preview...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/40 bg-background p-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-amber-500/30 bg-background p-10 text-center shadow-sm">
              <div className="space-y-3">
                <p className="text-base font-semibold text-foreground">
                  Live preview unavailable
                </p>
                <p className="text-sm text-muted-foreground">
                  {loadError === "loopback_unreachable"
                    ? `Frontend is not responding at ${previewTargetLabel}. Start the public frontend or update the configured public URL.`
                    : `Preview could not load from ${previewTargetLabel}. Check that the public frontend is reachable and the configured public URL is correct.`}
                </p>
                {onFixPreviewTarget ? (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onFixPreviewTarget}
                    >
                      {fixPreviewTargetLabel}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : !canPreview ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              {cannotPreviewMessage}
            </div>
          ) : showEmpty ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : !previewUrl ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-sm text-muted-foreground">
              {unavailableMessage}
            </div>
          ) : (
            <div className="mx-auto w-fit rounded-2xl border bg-background shadow-sm">
              <iframe
                key={iframeKey}
                title={iframeTitle}
                sandbox="allow-same-origin allow-scripts"
                src={iframeSrc ?? previewUrl}
                className={cn(
                  "block rounded-2xl transition-opacity",
                  iframeReady ? "opacity-100" : "opacity-0"
                )}
                style={{ width: viewport.width, height: viewport.height }}
                data-preview-device={resolvedDevice}
                onLoad={() => {
                  setLoadedSrc(iframeKey);
                  setLoadError(null);
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
