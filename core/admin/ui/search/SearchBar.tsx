import { useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { SearchResults } from "./SearchResults";
import { useSearchResults } from "./useSearchResults";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { normalizedQuery, shouldSearch, groups, items, loading, error } =
    useSearchResults(query, 8);
  const shouldShow = shouldSearch;

  const totalItems = items.length;

  const highlightIndex = totalItems > 0 ? Math.min(activeIndex, totalItems - 1) : 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shouldSearch || totalItems === 0) return;
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
        {loading ? (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground shadow-lg">
            Searching...
          </div>
        ) : error ? (
          <div className="rounded-xl border bg-background p-4 text-sm text-destructive shadow-lg">
            Search unavailable. Try again.
          </div>
        ) : (
          <SearchResults
            query={normalizedQuery}
            groups={groups}
            activeIndex={highlightIndex}
            onSelect={() => {
              setQuery("");
              setActiveIndex(0);
            }}
          />
        )}
      </div>
    </div>
  );
}
