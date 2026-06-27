import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const PALETTE = [
  "bg-violet-200 text-violet-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-sky-200 text-sky-800",
  "bg-rose-200 text-rose-800",
  "bg-teal-200 text-teal-800",
];

const hashTone = (seed: string) => {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) total += seed.charCodeAt(i);
  return PALETTE[total % PALETTE.length];
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function Avatar({
  name,
  src,
  size = "md",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-7 text-[11px]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
  } as const;
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        sizes[size],
        src ? "" : hashTone(name),
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span>{initialsOf(name) || "?"}</span>
      )}
    </div>
  );
}
