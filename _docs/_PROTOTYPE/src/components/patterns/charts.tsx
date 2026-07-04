import { useId } from "react";

import { cn } from "@/lib/cn";

/** Pure-SVG charts so the prototype needs no charting dependency. Decorative, deterministic. */

function buildPath(values: number[], width: number, height: number, pad = 2) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1 || 1);
  return values.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return { x, y };
  });
}

export function AreaChart({
  data,
  className,
  height = 180,
  tone = "primary",
}: {
  data: number[];
  className?: string;
  height?: number;
  tone?: "primary" | "success" | "info";
}) {
  const id = useId().replace(/:/g, "");
  const width = 600;
  const points = buildPath(data, width, height, 6);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;
  const stroke = {
    primary: "var(--primary)",
    success: "var(--success)",
    info: "var(--info)",
  }[tone];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-44 w-full", className)}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) =>
        i === points.length - 1 ? (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={stroke} />
        ) : null,
      )}
    </svg>
  );
}

export function BarChart({
  data,
  labels,
  className,
  height = 180,
}: {
  data: number[];
  labels?: string[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className={cn("flex w-full items-end gap-2", className)} style={{ height }}>
      {data.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-primary/80 transition-all hover:bg-primary"
              style={{ height: `${(value / max) * 100}%` }}
              title={labels?.[index]}
            />
          </div>
          {labels ? (
            <span className="text-[11px] text-muted-foreground">{labels[index]}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Sparkline({
  data,
  className,
  tone = "primary",
}: {
  data: number[];
  className?: string;
  tone?: "primary" | "success" | "destructive";
}) {
  const width = 120;
  const height = 36;
  const points = buildPath(data, width, height, 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const stroke = {
    primary: "var(--primary)",
    success: "var(--success)",
    destructive: "var(--destructive)",
  }[tone];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-9 w-28", className)}
      role="img"
      aria-hidden
    >
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Donut({
  segments,
  className,
  size = 140,
  thickness = 18,
}: {
  segments: { value: number; color: string; label?: string }[];
  className?: string;
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += length;
          return circle;
        })}
      </g>
    </svg>
  );
}
