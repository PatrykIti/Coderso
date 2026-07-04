import { cn } from "@/lib/utils";

type RegionProps = {
  children: React.ReactNode;
  className?: string;
};

export function PostEditorHeaderRegion({ children, className }: RegionProps) {
  return (
    <header
      data-post-editor-region="header"
      className={cn("shrink-0 border-b border-border bg-muted/40", className)}
      aria-label="Post editor header"
    >
      {children}
    </header>
  );
}

export function PostEditorContentRegion({ children, className }: RegionProps) {
  return (
    <main
      data-post-editor-region="content"
      className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden", className)}
      aria-label="Post editor content"
    >
      {children}
    </main>
  );
}

export function PostEditorFooterRegion({ children, className }: RegionProps) {
  return (
    <footer
      data-post-editor-region="footer"
      className={cn("shrink-0 border-t bg-background", className)}
      aria-label="Post editor footer"
    >
      {children}
    </footer>
  );
}

export function PostEditorSecondarySidebarRegion({ children, className }: RegionProps) {
  return (
    <aside
      data-post-editor-region="secondary-sidebar"
      className={cn(
        "hidden h-full min-h-0 w-60 shrink-0 border-r border-border bg-muted/20 lg:block",
        className
      )}
      aria-label="Post editor secondary sidebar"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">{children}</div>
    </aside>
  );
}

export function PostEditorSidebarRegion({ children, className }: RegionProps) {
  return (
    <aside
      data-post-editor-region="sidebar"
      className={cn(
        "hidden h-full min-h-0 w-72 shrink-0 border-l border-border bg-card lg:block",
        className
      )}
      aria-label="Post editor details sidebar"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">{children}</div>
    </aside>
  );
}
