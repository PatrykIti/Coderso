import { Building2, FolderKanban, type LucideIcon } from "lucide-react";

/**
 * Mock registry for PUBLISHED custom screens — the ones that appear in the left
 * sidebar under their own name. Each screen owns a content type, a configurable
 * table of entries, and (via the entry editor) a screen-defined entry view.
 * Shared by the List View and the Entry editor so they stay in sync.
 */

export type ColumnType =
  | "title"
  | "status"
  | "person"
  | "badge"
  | "money"
  | "progress"
  | "date"
  | "tags"
  | "text";

export type ScreenColumn = {
  key: string;
  label: string;
  type: ColumnType;
  visible: boolean;
  locked?: boolean;
  subKey?: string;
};

export type ScreenStat = { label: string; value: string; delta?: string; trend?: "up" | "down" | "flat" };
export type ScreenRow = Record<string, unknown>;

export type ScreenDef = {
  id: string;
  name: string;
  singular: string;
  contentType: string;
  icon: LucideIcon;
  description: string;
  views: string[];
  columns: ScreenColumn[];
  stats: ScreenStat[];
  rows: ScreenRow[];
};

const projectCatalog: ScreenDef = {
  id: "project-catalog",
  name: "Projects",
  singular: "Project",
  contentType: "Project",
  icon: FolderKanban,
  description: "A catalog of your client projects.",
  views: ["Table", "Board", "Gallery", "Calendar"],
  columns: [
    { key: "name", label: "Project", type: "title", visible: true, locked: true, subKey: "client" },
    { key: "status", label: "Status", type: "status", visible: true },
    { key: "owner", label: "Owner", type: "person", visible: true },
    { key: "phase", label: "Phase", type: "badge", visible: true },
    { key: "budget", label: "Budget", type: "money", visible: true },
    { key: "progress", label: "Progress", type: "progress", visible: true },
    { key: "due", label: "Due date", type: "date", visible: true },
    { key: "created", label: "Created", type: "date", visible: false },
    { key: "tags", label: "Tags", type: "tags", visible: false },
  ],
  stats: [
    { label: "Total", value: "24", delta: "+3", trend: "up" },
    { label: "Active", value: "14", delta: "+2", trend: "up" },
    { label: "Completed", value: "7" },
    { label: "Overdue", value: "2", delta: "+1", trend: "down" },
  ],
  rows: [
    { name: "Website Redesign", client: "Acme Co", status: "active", owner: "Maria Nowak", phase: "Design", budget: "$48,000", progress: 62, due: "Jul 18, 2026", created: "May 03, 2026", tags: ["web", "design"] },
    { name: "Mobile App v2", client: "Globex", status: "active", owner: "Jonas Weber", phase: "Build", budget: "$120,000", progress: 38, due: "Sep 02, 2026", created: "Apr 21, 2026", tags: ["mobile"] },
    { name: "Brand Refresh", client: "Initech", status: "review", owner: "Aiko Tanaka", phase: "Discovery", budget: "$22,000", progress: 85, due: "Jun 30, 2026", created: "Mar 12, 2026", tags: ["brand"] },
    { name: "E-commerce Migration", client: "Umbrella", status: "active", owner: "Chen Wei", phase: "Build", budget: "$96,500", progress: 47, due: "Aug 14, 2026", created: "Feb 28, 2026", tags: ["web", "commerce"] },
    { name: "Marketing Site", client: "Soylent", status: "completed", owner: "Liam O'Brien", phase: "Launch", budget: "$31,000", progress: 100, due: "Apr 28, 2026", created: "Jan 19, 2026", tags: ["web"] },
    { name: "Design System", client: "Hooli", status: "active", owner: "Patryk Ciechański", phase: "Build", budget: "$54,000", progress: 71, due: "Jul 09, 2026", created: "Mar 02, 2026", tags: ["design", "system"] },
    { name: "Analytics Dashboard", client: "Stark Industries", status: "on hold", owner: "Sofia Rossi", phase: "Discovery", budget: "$40,000", progress: 12, due: "Oct 01, 2026", created: "May 22, 2026", tags: ["data"] },
  ],
};

const clients: ScreenDef = {
  id: "clients",
  name: "Clients",
  singular: "Client",
  contentType: "Client",
  icon: Building2,
  description: "Your client accounts and contacts.",
  views: ["Table", "Board", "Gallery"],
  columns: [
    { key: "name", label: "Company", type: "title", visible: true, locked: true, subKey: "contact" },
    { key: "status", label: "Status", type: "status", visible: true },
    { key: "owner", label: "Account owner", type: "person", visible: true },
    { key: "plan", label: "Plan", type: "badge", visible: true },
    { key: "mrr", label: "MRR", type: "money", visible: true },
    { key: "health", label: "Health", type: "progress", visible: true },
    { key: "since", label: "Customer since", type: "date", visible: false },
    { key: "tags", label: "Tags", type: "tags", visible: false },
  ],
  stats: [
    { label: "Total", value: "86", delta: "+5", trend: "up" },
    { label: "Active", value: "61", delta: "+3", trend: "up" },
    { label: "Leads", value: "12" },
    { label: "MRR", value: "$48.2k", delta: "+6.1%", trend: "up" },
  ],
  rows: [
    { name: "Acme Co", contact: "Jane Cooper", status: "active", owner: "Maria Nowak", plan: "Enterprise", mrr: "$4,200/mo", health: 88, since: "Jan 12, 2025", tags: ["vip"] },
    { name: "Globex", contact: "Devon Lane", status: "active", owner: "Jonas Weber", plan: "Pro", mrr: "$890/mo", health: 74, since: "Mar 04, 2025", tags: [] },
    { name: "Initech", contact: "Esther Howard", status: "lead", owner: "Aiko Tanaka", plan: "—", mrr: "$0", health: 40, since: "Jun 01, 2026", tags: ["new"] },
    { name: "Umbrella", contact: "Cody Fisher", status: "active", owner: "Chen Wei", plan: "Enterprise", mrr: "$6,500/mo", health: 92, since: "Nov 22, 2024", tags: ["vip"] },
    { name: "Soylent", contact: "Kristin Watson", status: "churned", owner: "Liam O'Brien", plan: "Pro", mrr: "$0", health: 20, since: "Feb 18, 2024", tags: [] },
    { name: "Hooli", contact: "Robert Fox", status: "active", owner: "Patryk Ciechański", plan: "Pro", mrr: "$1,250/mo", health: 66, since: "Aug 30, 2025", tags: [] },
  ],
};

export const SCREENS: Record<string, ScreenDef> = {
  "project-catalog": projectCatalog,
  clients,
};

/** Published screens, in sidebar order. */
export const PUBLISHED_SCREEN_IDS = ["project-catalog", "clients"];

export const getScreen = (id?: string | null): ScreenDef =>
  (id && SCREENS[id]) || projectCatalog;

/** Extract the screen id + entry id from a prototype path like
 *  /advanced/custom-screens/<id>/entries[/<entryId>]. */
export const parseScreenPath = (path: string): { id: string; entryId: string | null } => {
  const parts = path.split("/").filter(Boolean); // [advanced, custom-screens, id, entries, entryId?]
  return { id: parts[2] ?? "project-catalog", entryId: parts[4] ?? null };
};
