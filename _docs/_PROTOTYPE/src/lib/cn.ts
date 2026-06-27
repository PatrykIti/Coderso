import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Same `cn` helper as core/admin/lib/utils — merges conditional + conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
