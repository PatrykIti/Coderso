import type { MenuItemRecord } from "@/services/menusClient";

export type MenuItemDisplay = MenuItemRecord & {
  pageTitle?: string | null;
  status?: "ok" | "error";
  children?: MenuItemDisplay[];
};
