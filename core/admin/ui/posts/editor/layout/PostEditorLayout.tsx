import { useEffect, useMemo, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminShell } from "@/ui/layouts/AdminShell";

import {
  PostEditorContentRegion,
  PostEditorFooterRegion,
  PostEditorHeaderRegion,
  PostEditorSecondarySidebarRegion,
  PostEditorSidebarRegion,
} from "./PostEditorRegions";

type PostEditorViewportMode = "auto" | "desktop" | "mobile";

type PostEditorLayoutProps = {
  activeHref: string;
  breadcrumbs?: React.ReactNode;
  header?: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
  secondarySidebar?: React.ReactNode;
  secondarySidebarOpen?: boolean;
  onSecondarySidebarOpenChange?: (open: boolean) => void;
  detailsSidebar?: React.ReactNode;
  detailsSidebarOpen?: boolean;
  onDetailsSidebarOpenChange?: (open: boolean) => void;
  focusMode?: boolean;
  viewportMode?: PostEditorViewportMode;
  compactSidePanels?: boolean;
};

const DESKTOP_BREAKPOINT_QUERY = "(min-width: 1024px)";

const resolveInitialDesktop = (viewportMode: PostEditorViewportMode) => {
  if (viewportMode === "desktop") return true;
  if (viewportMode === "mobile") return false;
  if (typeof window === "undefined") return true;
  return window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches;
};

export function PostEditorLayout({
  activeHref,
  breadcrumbs,
  header,
  content,
  footer,
  secondarySidebar,
  secondarySidebarOpen = false,
  onSecondarySidebarOpenChange,
  detailsSidebar,
  detailsSidebarOpen = false,
  onDetailsSidebarOpenChange,
  focusMode = false,
  viewportMode = "auto",
  compactSidePanels = false,
}: PostEditorLayoutProps) {
  const [matchesDesktopQuery, setMatchesDesktopQuery] = useState(() =>
    resolveInitialDesktop("auto")
  );

  useEffect(() => {
    if (viewportMode !== "auto") return;
    if (typeof window === "undefined") return;
    const media = window.matchMedia(DESKTOP_BREAKPOINT_QUERY);
    const sync = () => setMatchesDesktopQuery(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [viewportMode]);

  const isDesktopViewport =
    viewportMode === "desktop"
      ? true
      : viewportMode === "mobile"
        ? false
        : matchesDesktopQuery;

  const showDesktopSecondary =
    isDesktopViewport &&
    !focusMode &&
    secondarySidebarOpen &&
    Boolean(secondarySidebar);
  const showDesktopDetails =
    isDesktopViewport &&
    !focusMode &&
    detailsSidebarOpen &&
    Boolean(detailsSidebar);
  const showMobileSecondary =
    !isDesktopViewport && !focusMode && Boolean(secondarySidebar);
  const showMobileDetails =
    !isDesktopViewport && !focusMode && Boolean(detailsSidebar);

  const contentRegion = useMemo(
    () => (
      <section className="min-h-0 min-w-0 flex-1 bg-background">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {header ? <PostEditorHeaderRegion>{header}</PostEditorHeaderRegion> : null}
          <PostEditorContentRegion>{content}</PostEditorContentRegion>
          {footer ? <PostEditorFooterRegion>{footer}</PostEditorFooterRegion> : null}
        </div>
      </section>
    ),
    [content, footer, header]
  );

  return (
    <AdminShell
      activeHref={activeHref}
      breadcrumbs={breadcrumbs}
      contentClassName="overflow-hidden p-0"
    >
      <div className="flex h-full min-h-0 min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {showDesktopSecondary ? (
          <PostEditorSecondarySidebarRegion className={compactSidePanels ? "w-56" : undefined}>
            {secondarySidebar}
          </PostEditorSecondarySidebarRegion>
        ) : null}

        {contentRegion}

        {showDesktopDetails ? (
          <PostEditorSidebarRegion className={compactSidePanels ? "w-72" : undefined}>
            {detailsSidebar}
          </PostEditorSidebarRegion>
        ) : null}
      </div>

      {showMobileSecondary ? (
        <Sheet
          open={secondarySidebarOpen}
          onOpenChange={(open) => onSecondarySidebarOpenChange?.(open)}
        >
          <SheetContent side="left" className="w-full max-w-sm p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Editor panel</SheetTitle>
            <SheetDescription className="sr-only">
              Open block list and block library panels.
            </SheetDescription>
            {secondarySidebar}
          </SheetContent>
        </Sheet>
      ) : null}

      {showMobileDetails ? (
        <Sheet
          open={detailsSidebarOpen}
          onOpenChange={(open) => onDetailsSidebarOpenChange?.(open)}
        >
          <SheetContent side="right" className="w-full max-w-sm p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Details</SheetTitle>
            <SheetDescription className="sr-only">
              Edit post and selected block settings.
            </SheetDescription>
            {detailsSidebar}
          </SheetContent>
        </Sheet>
      ) : null}
    </AdminShell>
  );
}
