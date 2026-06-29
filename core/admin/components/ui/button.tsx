import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // TASK-479-06-L01: soft/violet restyle — rounded-xl base, soft shadow, active press.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Keep var-indirection so the TASK-479-05 token swap (incl. dark) flows through.
        default:
          "bg-[var(--admin-button-primary-bg)] text-[var(--admin-button-primary-text)] shadow-soft hover:bg-[var(--admin-button-primary-hover-bg)]",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
        secondary:
          "bg-[var(--admin-button-secondary-bg)] text-[var(--admin-button-secondary-text)] border border-border hover:bg-[var(--admin-button-secondary-hover-bg)]",
        outline:
          "border border-[var(--admin-button-outline-border)] bg-card text-[var(--admin-button-outline-text)] shadow-soft hover:bg-[var(--admin-button-outline-hover-bg)]",
        ghost:
          "hover:bg-[var(--admin-button-ghost-hover-bg)] hover:text-[var(--admin-button-ghost-hover-text)]",
        destructive:
          "bg-destructive text-white shadow-soft hover:bg-destructive/90 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 rounded-2xl px-6 text-[15px] has-[>svg]:px-4",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
