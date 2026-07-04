import { Wand2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Badge } from "@/components/ui/badge";

/** Placeholder used until a screen's real design is generated. */
export function StubPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader
        title={title}
        description="This screen is part of the prototype scope."
        actions={<Badge variant="soft">Design in progress</Badge>}
      />
      <EmptyState
        icon={<Wand2 />}
        title={`${title} — coming together`}
        description="The visual design for this screen is being generated. It will appear here in the modern soft/violet style."
      />
    </div>
  );
}
