export type MenuItemNode = {
  id: string;
  label: string;
  href?: string;
  pageTitle?: string;
  status?: "ok" | "error";
  children?: MenuItemNode[];
};
