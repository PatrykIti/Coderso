import type { ComponentType } from "react";
import { icons } from "lucide-react";
import type { LucideProps } from "lucide-react";

// Heavy module: pulls the full lucide icon set. It is intentionally only reached
// through a dynamic import (see loadFullTimelineIcons in timeline.tsx) so the entire
// icon library stays OUT of the admin initial static bundle graph.

const toKebabIconName = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

// Full lucide set keyed by kebab-case name, SSR-renderable to <svg>. Keys are derived
// directly from the icon record so every icon resolves with no lossy reverse mapping.
export const lucideKebabIconComponents: Record<
  string,
  ComponentType<LucideProps>
> = Object.fromEntries(
  Object.entries(icons).map(([pascalName, component]) => [
    toKebabIconName(pascalName),
    component as ComponentType<LucideProps>,
  ])
);

// All selectable icon names (kebab-case) for the editor's full icon browser.
export const lucideIconNames: string[] = Object.keys(lucideKebabIconComponents).sort();
