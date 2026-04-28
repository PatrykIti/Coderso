"use client"

import type { CSSProperties } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { cn } from "@/lib/utils"

export const ADMIN_TOASTER_TOKEN_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--success-bg": "var(--popover)",
  "--success-text": "var(--popover-foreground)",
  "--success-border": "var(--admin-state-success)",
  "--error-bg": "var(--popover)",
  "--error-text": "var(--popover-foreground)",
  "--error-border": "var(--admin-state-danger)",
  "--warning-bg": "var(--popover)",
  "--warning-text": "var(--popover-foreground)",
  "--warning-border": "var(--admin-state-warning)",
  "--info-bg": "var(--popover)",
  "--info-text": "var(--popover-foreground)",
  "--info-border": "var(--border)",
  "--border-radius": "var(--radius)",
  "--admin-toast-description": "var(--muted-foreground)",
  "--admin-toast-close-bg": "var(--popover)",
  "--admin-toast-close-text": "var(--popover-foreground)",
  "--admin-toast-close-border": "var(--border)",
  "--admin-toast-action-bg": "var(--primary)",
  "--admin-toast-action-text": "var(--primary-foreground)",
  "--admin-toast-cancel-bg": "var(--secondary)",
  "--admin-toast-cancel-text": "var(--secondary-foreground)",
  "--admin-toast-focus": "var(--ring)",
  "--admin-toast-hover-bg": "var(--accent)",
  "--admin-toast-shadow": "0 18px 50px color-mix(in srgb, var(--foreground) 14%, transparent)",
} as CSSProperties

const Toaster = ({
  className,
  icons,
  style,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster group", className)}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        ...icons,
      }}
      style={{ ...style, ...ADMIN_TOASTER_TOKEN_STYLE }}
      {...props}
    />
  )
}

export { Toaster }
