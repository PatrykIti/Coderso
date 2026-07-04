/** Shared deterministic mock data so screens feel like one coherent product. */

export const PEOPLE = [
  { name: "Patryk Ciechański", email: "patryk@coderso.dev", role: "Owner" },
  { name: "Maria Nowak", email: "maria@coderso.dev", role: "Admin" },
  { name: "Jonas Weber", email: "jonas@coderso.dev", role: "Editor" },
  { name: "Aiko Tanaka", email: "aiko@coderso.dev", role: "Editor" },
  { name: "Liam O'Brien", email: "liam@coderso.dev", role: "Author" },
  { name: "Sofia Rossi", email: "sofia@coderso.dev", role: "Viewer" },
  { name: "Noah Andersson", email: "noah@coderso.dev", role: "Author" },
  { name: "Chen Wei", email: "chen@coderso.dev", role: "Admin" },
];

export const PAGE_TITLES = [
  "Home",
  "About us",
  "Pricing",
  "Contact",
  "Features",
  "Careers",
  "Blog index",
  "Case studies",
  "Privacy policy",
  "Terms of service",
  "Help center",
  "Changelog",
];

export const POST_TITLES = [
  "Introducing Coderso 2.0",
  "How we rebuilt the page editor",
  "Designing for content teams",
  "10 tips for faster publishing",
  "A guide to custom screens",
  "Why we chose Tailwind v4",
  "Scaling media pipelines",
  "Inside our plugin marketplace",
];

export const STATUSES = ["published", "draft", "scheduled", "review"] as const;

export const RELATIVE_TIMES = [
  "2m ago",
  "14m ago",
  "1h ago",
  "3h ago",
  "Yesterday",
  "2 days ago",
  "Last week",
  "Mar 14",
  "Mar 11",
  "Feb 28",
];

export const DATES = [
  "Jun 27, 2026",
  "Jun 24, 2026",
  "Jun 18, 2026",
  "Jun 09, 2026",
  "May 30, 2026",
  "May 21, 2026",
  "May 12, 2026",
  "Apr 28, 2026",
];

/** Deterministic pseudo-random from an index, so layouts are stable across renders. */
export const seeded = (index: number, max: number, min = 0) =>
  min + (Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1) * (max - min);

export const spark = (seed: number, length = 14) =>
  Array.from({ length }, (_, i) => Math.round(seeded(seed + i * 3, 100, 20)));

export const pick = <T,>(list: T[], index: number) => list[index % list.length];
