/**
 * Shared integration health UI meta (TASK-491-04-L02). Single source of truth
 * for how `unknown | healthy | issue` renders on the card and in the drawer,
 * so the two surfaces can never drift apart.
 */

export type IntegrationHealth = "unknown" | "healthy" | "issue";

export const integrationHealthMeta: Record<
  IntegrationHealth,
  { label: string; dot: string; text: string }
> = {
  healthy: { label: "Healthy", dot: "bg-success", text: "text-success" },
  issue: { label: "Issue", dot: "bg-destructive", text: "text-destructive" },
  unknown: { label: "Not checked", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};
