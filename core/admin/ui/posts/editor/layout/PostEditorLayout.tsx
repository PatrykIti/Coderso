import { useEffect, useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";
import type { AdminBreadcrumbInput } from "@/ui/shared/AdminBreadcrumbs";
import { PageHeader } from "@/ui/shared/PageHeader";

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
  breadcrumbs?: React.ReactNode | AdminBreadcrumbInput[];
  pageTitle?: string;
  pageDescription?: React.ReactNode;
  pageActions?: React.ReactNode;
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
  editorDensity?: "comfortable" | "compact";
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
  pageTitle,
  pageDescription,
  pageActions,
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
  editorDensity = "comfortable",
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
    viewportMode === "desktop" ? true : viewportMode === "mobile" ? false : matchesDesktopQuery;

  const showDesktopSecondary =
    isDesktopViewport && !focusMode && secondarySidebarOpen && Boolean(secondarySidebar);
  const showDesktopDetails =
    isDesktopViewport && !focusMode && detailsSidebarOpen && Boolean(detailsSidebar);
  const showMobileSecondary = !isDesktopViewport && !focusMode && Boolean(secondarySidebar);
  const showMobileDetails = !isDesktopViewport && !focusMode && Boolean(detailsSidebar);

  const showPageHeader = Boolean(pageTitle || pageDescription || pageActions);

  return (
    <AdminShell activeHref={activeHref} breadcrumbs={breadcrumbs}>
      {showPageHeader ? (
        <PageHeader title={pageTitle} description={pageDescription} actions={pageActions} />
      ) : null}

      <div
        className={cn(
          "flex min-h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card",
          editorDensity === "compact" ? "text-[13px]" : "text-[14px]"
        )}
        data-post-editor-frame="true"
        data-post-editor-density={editorDensity}
      >
        {header ? <PostEditorHeaderRegion>{header}</PostEditorHeaderRegion> : null}

        <div className="flex min-h-0 flex-1">
          {showDesktopSecondary ? (
            <PostEditorSecondarySidebarRegion className={compactSidePanels ? "w-56" : undefined}>
              {secondarySidebar}
            </PostEditorSecondarySidebarRegion>
          ) : null}

          <PostEditorContentRegion>{content}</PostEditorContentRegion>

          {showDesktopDetails ? (
            <PostEditorSidebarRegion className={compactSidePanels ? "w-64" : undefined}>
              {detailsSidebar}
            </PostEditorSidebarRegion>
          ) : null}
        </div>

        {footer ? <PostEditorFooterRegion>{footer}</PostEditorFooterRegion> : null}
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
