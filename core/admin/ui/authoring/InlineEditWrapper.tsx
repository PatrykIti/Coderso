import type { FocusEvent, KeyboardEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

type InlineEditTag = "span" | "p" | "div" | "h1" | "h2" | "h3" | "strong";

export type InlineEditWrapperProps = {
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
  as?: InlineEditTag;
  className?: string;
  readOnlyClassName?: string;
  ariaLabel?: string;
  placeholder?: string;
  children?: ReactNode;
};

export function InlineEditWrapper({
  value,
  editable,
  onCommit,
  as: Tag = "span",
  className,
  readOnlyClassName,
  ariaLabel,
  placeholder,
  children,
}: InlineEditWrapperProps) {
  const displayValue = value.length > 0 ? value : (placeholder ?? "");
  const commitValue = (event: FocusEvent<HTMLElement>) => {
    const next = event.currentTarget.textContent ?? "";
    if (next !== value) {
      onCommit(next);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.textContent = value;
      event.currentTarget.blur();
    }
  };

  if (!editable) {
    return <Tag className={cn(className, readOnlyClassName)}>{children ?? displayValue}</Tag>;
  }

  return (
    <Tag
      role="textbox"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      className={cn(
        "cursor-text rounded-sm outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus-visible:ring-2 focus-visible:ring-primary/45",
        className
      )}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      tabIndex={0}
      onBlur={commitValue}
      onKeyDown={handleKeyDown}
    >
      {value}
    </Tag>
  );
}
