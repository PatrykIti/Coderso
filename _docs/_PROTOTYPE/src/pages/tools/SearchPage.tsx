import { FileText, Image, Newspaper, Search, User } from "lucide-react";
import { type ReactNode } from "react";

import { SectionCard } from "@/components/patterns/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "@/lib/router";
import { PAGE_TITLES, PEOPLE, POST_TITLES } from "@/lib/mock";

type Result = {
  title: string;
  path: string;
  type: string;
  icon: ReactNode;
};

type Group = {
  label: string;
  results: Result[];
};

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const GROUPS: Group[] = [
  {
    label: "Pages",
    results: PAGE_TITLES.slice(0, 3).map((title) => ({
      title,
      path: `coderso.dev / ${slug(title)}`,
      type: "Page",
      icon: <FileText className="size-4" />,
    })),
  },
  {
    label: "Posts",
    results: POST_TITLES.slice(0, 3).map((title) => ({
      title,
      path: `Blog / ${slug(title)}`,
      type: "Post",
      icon: <Newspaper className="size-4" />,
    })),
  },
  {
    label: "Media",
    results: [
      { title: "hero-banner.png", path: "Media / images", type: "Media", icon: <Image className="size-4" /> },
      { title: "product-tour.mp4", path: "Media / video", type: "Media", icon: <Image className="size-4" /> },
    ],
  },
  {
    label: "Users",
    results: PEOPLE.slice(0, 3).map((person) => ({
      title: person.name,
      path: person.email,
      type: person.role,
      icon: <User className="size-4" />,
    })),
  },
];

const RECENT = ["Pricing page", "hero-banner.png", "Maria Nowak", "Changelog", "Plugins"];

export function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find anything across pages, posts, media, and people.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search pages, posts, media, users…"
          className="h-12 rounded-2xl pl-12 pr-16 text-base shadow-card"
        />
        <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Recent</span>
        {RECENT.map((item) => (
          <Badge key={item} variant="outline" className="cursor-pointer hover:bg-muted">
            {item}
          </Badge>
        ))}
      </div>

      <SectionCard className="mt-6" bodyClassName="p-0" padded={false}>
        <div className="divide-y divide-border">
          {GROUPS.map((group) => (
            <div key={group.label} className="py-2">
              <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              {group.results.map((result) => (
                <Link
                  key={result.title}
                  to="/search"
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    {result.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{result.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{result.path}</span>
                  </span>
                  <Badge variant="outline">{result.type}</Badge>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
