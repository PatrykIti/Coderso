import type { ComponentType } from "react";
import {
  Calendar,
  Check,
  Circle,
  CircleDot,
  Clock,
  Flag,
  Heart,
  Lightbulb,
  MapPin,
  Package,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideProps,
} from "lucide-react";

// Quick-pick icons are statically imported (tree-shaken) so the common set renders
// synchronously without pulling the full lucide library into the admin initial bundle.
export const timelineQuickIconComponents: Record<string, ComponentType<LucideProps>> = {
  check: Check,
  circle: Circle,
  "circle-dot": CircleDot,
  star: Star,
  rocket: Rocket,
  flag: Flag,
  calendar: Calendar,
  clock: Clock,
  "map-pin": MapPin,
  sparkles: Sparkles,
  zap: Zap,
  trophy: Trophy,
  heart: Heart,
  lightbulb: Lightbulb,
  package: Package,
  target: Target,
};

// The full lucide set lives in a dynamically-imported module so it is code-split out
// of the admin initial static graph. resolveLucideIcon returns quick icons
// synchronously and full icons once loaded; unknown/unloaded names fall back to a dot.
let fullIconComponents: Record<string, ComponentType<LucideProps>> | null = null;
let fullTimelineIconsPromise: Promise<{
  components: Record<string, ComponentType<LucideProps>>;
  names: string[];
}> | null = null;

export function loadFullTimelineIcons() {
  if (!fullTimelineIconsPromise) {
    fullTimelineIconsPromise = import("./timelineLucideIcons").then((module) => {
      fullIconComponents = module.lucideKebabIconComponents;
      return { components: module.lucideKebabIconComponents, names: module.lucideIconNames };
    });
  }
  return fullTimelineIconsPromise;
}

export function resolveLucideIcon(
  name: string | undefined
): ComponentType<LucideProps> | undefined {
  if (!name || name === "none") return undefined;
  return timelineQuickIconComponents[name] ?? fullIconComponents?.[name];
}

// Preload the full set off the initial graph: eagerly on the server (so SSR resolves
// arbitrary icons), lazily in the browser (the admin editor triggers it on demand).
if (typeof window === "undefined") {
  void loadFullTimelineIcons();
}
