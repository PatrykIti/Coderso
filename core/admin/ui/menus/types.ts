import type { MenuItemRecord } from "@/services/menusClient";

export type MenuItemDisplay = MenuItemRecord & {
  pageTitle?: string | null;
  parentLabel?: string | null;
  status?: "ok" | "error";
  children?: MenuItemDisplay[];
};
