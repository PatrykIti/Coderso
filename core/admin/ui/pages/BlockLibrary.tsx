import {
  AlignLeft,
  Columns,
  GalleryVerticalEnd,
  Image,
  LayoutGrid,
  Search,
  Square,
  Type,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo, useState } from "react";

const categories = [
  {
    id: "layout",
    label: "Layout Blocks",
    items: [
      { label: "Container", icon: LayoutGrid },
      { label: "Grid 2x2", icon: Columns },
      { label: "Columns", icon: GalleryVerticalEnd },
      { label: "Spacer", icon: Square },
    ],
  },
  {
    id: "basic",
    label: "Basic Elements",
    items: [
      { label: "Heading", icon: Type },
      { label: "Text block", icon: AlignLeft },
      { label: "Button", icon: Square },
    ],
  },
  {
    id: "media",
    label: "Media",
    items: [{ label: "Image", icon: Image }],
  },
];

export function BlockLibrary() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.label.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [normalizedQuery]);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Find components..."
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <Accordion
          type="multiple"
          defaultValue={filteredCategories.map((cat) => cat.id)}
        >
          {filteredCategories.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              No components match this search.
            </div>
          ) : null}
          {filteredCategories.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category.label}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {category.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex cursor-grab items-center gap-2 rounded-lg border bg-background p-2 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] uppercase"
                      >
                        Block
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
