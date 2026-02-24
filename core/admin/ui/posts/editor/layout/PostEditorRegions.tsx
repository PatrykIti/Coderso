import { cn } from "@/lib/utils";

type RegionProps = {
  children: React.ReactNode;
  className?: string;
};

export function PostEditorHeaderRegion({ children, className }: RegionProps) {
  return (
    <header
      data-post-editor-region="header"
      className={cn("shrink-0 border-b bg-background/95 backdrop-blur", className)}
    >
      {children}
    </header>
  );
}

export function PostEditorContentRegion({ children, className }: RegionProps) {
  return (
    <main
      data-post-editor-region="content"
      className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", className)}
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
    >
      {children}
    </footer>
  );
}

export function PostEditorSecondarySidebarRegion({
  children,
  className,
}: RegionProps) {
  return (
    <aside
      data-post-editor-region="secondary-sidebar"
      className={cn(
        "hidden h-full min-h-0 w-64 shrink-0 border-r bg-background lg:block",
        className
      )}
      aria-label="Post editor secondary sidebar"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}

export function PostEditorSidebarRegion({ children, className }: RegionProps) {
  return (
    <aside
      data-post-editor-region="sidebar"
      className={cn(
        "hidden h-full min-h-0 w-80 shrink-0 border-l bg-background lg:block",
        className
      )}
      aria-label="Post editor details sidebar"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
