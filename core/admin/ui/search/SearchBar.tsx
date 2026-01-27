import { useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  SearchResults,
  groupResults,
  type SearchItem,
} from "./SearchResults";

const sampleItems: SearchItem[] = [
  {
    id: "page-1",
    type: "page",
    title: "Homepage",
    subtitle: "/home",
  },
  {
    id: "page-2",
    type: "page",
    title: "About us",
    subtitle: "/about",
  },
  {
    id: "entry-1",
    type: "entry",
    title: "Launch announcement",
    subtitle: "Blog post",
  },
  {
    id: "entry-2",
    type: "entry",
    title: "Roadmap update",
    subtitle: "News",
  },
  {
    id: "media-1",
    type: "media",
    title: "Hero banner",
    subtitle: "hero-banner_v2.jpg",
  },
];

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const normalized = normalizeQuery(query);
  const shouldShow = normalized.length >= 2;

  const items = useMemo(() => {
    if (!shouldShow) return [];
    const lowered = normalized.toLowerCase();
    return sampleItems.filter((item) =>
      item.title.toLowerCase().includes(lowered)
    );
  }, [normalized, shouldShow]);

  const groups = useMemo(() => groupResults(items), [items]);
  const totalItems = items.length;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShow || totalItems === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalItems);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setQuery("");
      setActiveIndex(0);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search pages, entries, media..."
        className="pl-9"
      />
      <div className={cn("absolute left-0 right-0 top-12 z-20", !shouldShow && "hidden")}>
        <SearchResults
          query={normalized}
          groups={groups}
          activeIndex={activeIndex}
          onSelect={() => {
            setQuery("");
            setActiveIndex(0);
          }}
        />
      </div>
    </div>
  );
}
