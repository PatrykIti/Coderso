import type { CSSProperties, ReactNode } from "react";

import { getWidget } from "../registry";
import { normalizeWidgetBlock } from "../validator";
import type {
  ContainerToken,
  DeviceTarget,
  SpacingToken,
  WidgetBlock,
  WidgetLayoutDefaults,
  WidgetRenderContext,
} from "../types";

const containerClassMap: Record<ContainerToken, string> = {
  default: "mx-auto w-full max-w-5xl",
  narrow: "mx-auto w-full max-w-3xl",
  full: "w-full",
};

const paddingTopClassMap: Record<SpacingToken, string> = {
  none: "pt-0",
  xs: "pt-2",
  sm: "pt-4",
  md: "pt-6",
  lg: "pt-8",
  xl: "pt-12",
  "2xl": "pt-16",
};

const paddingBottomClassMap: Record<SpacingToken, string> = {
  none: "pb-0",
  xs: "pb-2",
  sm: "pb-4",
  md: "pb-6",
  lg: "pb-8",
  xl: "pb-12",
  "2xl": "pb-16",
};

const marginTopClassMap: Record<SpacingToken, string> = {
  none: "mt-0",
  xs: "mt-2",
  sm: "mt-4",
  md: "mt-6",
  lg: "mt-8",
  xl: "mt-12",
  "2xl": "mt-16",
};

const marginBottomClassMap: Record<SpacingToken, string> = {
  none: "mb-0",
  xs: "mb-2",
  sm: "mb-4",
  md: "mb-6",
  lg: "mb-8",
  xl: "mb-12",
  "2xl": "mb-16",
};

const defaultLayout: {
  container: ContainerToken;
  padding: { top: SpacingToken; bottom: SpacingToken };
  margin: { top: SpacingToken; bottom: SpacingToken };
  background: { color: string; image?: string | null };
} = {
  container: "default",
  padding: { top: "md", bottom: "md" },
  margin: { top: "none", bottom: "none" },
  background: { color: "transparent", image: null },
};

export type WidgetRendererPageDefaults = WidgetLayoutDefaults;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const isStickyNavigationBlock = (block: WidgetBlock) => {
  if (block.type !== "navigation") return false;
  const data = block.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const behavior = (data as { behavior?: unknown }).behavior;
  if (!behavior || typeof behavior !== "object" || Array.isArray(behavior)) return false;
  const parsed = behavior as { collapseOnScroll?: unknown; sticky?: unknown };
  return parsed.sticky === true || parsed.collapseOnScroll === true;
};

const resolveContainerToken = (
  value: unknown,
  fallback: ContainerToken,
  defaults?: WidgetRendererPageDefaults
): ContainerToken => {
  if (value === "inherit") return defaults?.container ?? fallback;
  return typeof value === "string" && value in containerClassMap
    ? (value as ContainerToken)
    : fallback;
};

const resolveSpacingToken = (
  value: unknown,
  fallback: SpacingToken,
  inherited: SpacingToken
): SpacingToken => {
  if (value === "inherit") return inherited;
  return typeof value === "string" && value in paddingTopClassMap
    ? (value as SpacingToken)
    : fallback;
};

export function createNestedRowFlowRenderContext(
  renderContext: WidgetRenderContext | undefined,
  previewDevice?: DeviceTarget
): WidgetRenderContext {
  const baseRenderContext = renderContext ?? {
    mode: "public" as const,
    previewDevice,
  };

  return {
    ...baseRenderContext,
    previewDevice: baseRenderContext.previewDevice ?? previewDevice,
    nestedSurface: "row-flow-item",
  };
}

export function MissingWidget({ type, message }: { type: string; message?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      {message ?? "Missing widget"}: {type}
    </div>
  );
}

export function WidgetRenderer({
  block,
  pageDefaults,
  previewDevice,
  renderContext: incomingRenderContext,
  renderBlock,
}: {
  block: WidgetBlock;
  pageDefaults?: WidgetRendererPageDefaults;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
}) {
  const def = getWidget(block.type);
  if (!def) {
    return <MissingWidget type={block.type} />;
  }

  let normalized: WidgetBlock;
  try {
    normalized = normalizeWidgetBlock(block);
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    const isDev = process.env.NODE_ENV !== "production";
    return (
      <MissingWidget
        type={block.type}
        message={isDev ? `Invalid widget data${detail}` : "Invalid widget data"}
      />
    );
  }
  if (normalized.visibility?.enabled === false) return null;
  if (Array.isArray(normalized.visibility?.devices)) {
    if (normalized.visibility.devices.length === 0) return null;
    if (previewDevice && !normalized.visibility.devices.includes(previewDevice)) return null;
  }

  const layout = normalized.layout ?? defaultLayout;
  const slots = normalized.slots;
  const legacyChildren = Array.isArray(normalized.children)
    ? normalized.children
    : (slots?.default ?? []);
  const hasSlotDefinitions = Array.isArray(def.slots) && def.slots.length > 0;
  const backgroundStyle: CSSProperties = {
    backgroundColor: layout.background?.color ?? "transparent",
    backgroundImage: layout.background?.image ? `url(${layout.background.image})` : undefined,
    backgroundSize: layout.background?.image ? "cover" : undefined,
    backgroundPosition: layout.background?.image ? "center" : undefined,
  };

  const container = resolveContainerToken(layout.container, defaultLayout.container, pageDefaults);
  const paddingTop = resolveSpacingToken(
    layout.padding.top,
    defaultLayout.padding.top,
    pageDefaults?.padding.top ?? defaultLayout.padding.top
  );
  const paddingBottom = resolveSpacingToken(
    layout.padding.bottom,
    defaultLayout.padding.bottom,
    pageDefaults?.padding.bottom ?? defaultLayout.padding.bottom
  );
  const marginTop = resolveSpacingToken(
    layout.margin.top,
    defaultLayout.margin.top,
    pageDefaults?.margin.top ?? defaultLayout.margin.top
  );
  const marginBottom = resolveSpacingToken(
    layout.margin.bottom,
    defaultLayout.margin.bottom,
    pageDefaults?.margin.bottom ?? defaultLayout.margin.bottom
  );

  const sectionClass = joinClasses(
    paddingTopClassMap[paddingTop],
    paddingBottomClassMap[paddingBottom],
    marginTopClassMap[marginTop],
    marginBottomClassMap[marginBottom]
  );

  const wrapperClass = joinClasses(containerClassMap[container]);

  const WidgetComponent = def.render;
  const renderContext = incomingRenderContext ?? {
    mode: "public",
    previewDevice,
  };
  const renderSurface = renderContext?.nestedSurface ?? "default-block";
  const stickyNavigationSurface = isStickyNavigationBlock(normalized);
  const renderBlockWithContext = (
    child: WidgetBlock,
    nextRenderContext: WidgetRenderContext = renderContext
  ) =>
    renderBlock ? (
      renderBlock(child, nextRenderContext)
    ) : (
      <WidgetRenderer
        block={child}
        pageDefaults={pageDefaults}
        previewDevice={previewDevice}
        renderContext={nextRenderContext}
      />
    );

  const widgetNode = (
    <>
      <WidgetComponent
        data={normalized.data}
        variant={normalized.variant ?? def.variants[0].id}
        slots={slots}
        previewDevice={previewDevice}
        pageDefaults={pageDefaults}
        blockId={normalized.id}
        renderContext={renderContext}
        renderBlock={renderBlockWithContext}
      />
      {!hasSlotDefinitions && legacyChildren.length ? (
        <div className="mt-6 flex flex-col gap-6">
          {legacyChildren.map((child) => (
            <div key={child.id}>{renderBlockWithContext(child)}</div>
          ))}
        </div>
      ) : null}
    </>
  );

  if (renderSurface === "row-flow-item") {
    return (
      <div
        className="min-w-0 max-w-full"
        data-widget-surface="row-flow-item"
        data-widget-type={normalized.type}
      >
        {widgetNode}
      </div>
    );
  }

  return (
    <section
      className={joinClasses(sectionClass, stickyNavigationSurface && "sticky z-40")}
      style={{
        ...backgroundStyle,
        top: stickyNavigationSurface ? "var(--coderso-preview-banner-offset, 0px)" : undefined,
      }}
      data-widget-sticky-surface={stickyNavigationSurface ? "navigation" : undefined}
    >
      <div className={wrapperClass}>{widgetNode}</div>
    </section>
  );
}
