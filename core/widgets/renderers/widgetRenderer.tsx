import type { CSSProperties } from "react";

import { getWidget } from "../registry";
import { normalizeWidgetBlock } from "../validator";
import type {
  ContainerToken,
  SpacingToken,
  WidgetBlock,
  WidgetLayout,
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

const defaultLayout: WidgetLayout = {
  container: "default",
  padding: { top: "md", bottom: "md" },
  margin: { top: "none", bottom: "none" },
  background: { color: "transparent", image: null },
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

export function MissingWidget({ type, message }: { type: string; message?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      {message ?? "Missing widget"}: {type}
    </div>
  );
}

export function WidgetRenderer({ block }: { block: WidgetBlock }) {
  const def = getWidget(block.type);
  if (!def) {
    return <MissingWidget type={block.type} />;
  }

  let normalized: WidgetBlock;
  try {
    normalized = normalizeWidgetBlock(block);
  } catch {
    return <MissingWidget type={block.type} message="Invalid widget data" />;
  }
  if (normalized.visibility?.enabled === false) return null;

  const layout = normalized.layout ?? defaultLayout;
  const children = Array.isArray(normalized.children) ? normalized.children : [];
  const backgroundStyle: CSSProperties = {
    backgroundColor: layout.background?.color ?? "transparent",
    backgroundImage: layout.background?.image
      ? `url(${layout.background.image})`
      : undefined,
    backgroundSize: layout.background?.image ? "cover" : undefined,
    backgroundPosition: layout.background?.image ? "center" : undefined,
  };

  const wrapperClass = joinClasses(
    containerClassMap[layout.container],
    paddingTopClassMap[layout.padding.top],
    paddingBottomClassMap[layout.padding.bottom],
    marginTopClassMap[layout.margin.top],
    marginBottomClassMap[layout.margin.bottom]
  );

  const WidgetComponent = def.render;

  return (
    <section style={backgroundStyle}>
      <div className={wrapperClass}>
        <WidgetComponent data={normalized.data} variant={normalized.variant ?? def.variants[0].id} />
        {children.length ? (
          <div className="mt-6 flex flex-col gap-6">
            {children.map((child) => (
              <WidgetRenderer key={child.id} block={child} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
