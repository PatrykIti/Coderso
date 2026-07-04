import {
  Box,
  Calendar,
  Database,
  FileText,
  FolderTree,
  HelpCircle,
  Layers,
  Plus,
  Quote,
  User,
  Wrench,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";
import { spark } from "@/lib/mock";

const TYPES = [
  { name: "Article", icon: FileText, fields: 9, entries: 124, tone: "bg-primary-soft text-primary-soft-foreground" },
  { name: "Product", icon: Box, fields: 14, entries: 86, tone: "bg-info-soft text-info" },
  { name: "Event", icon: Calendar, fields: 11, entries: 32, tone: "bg-success-soft text-success" },
  { name: "Author", icon: User, fields: 7, entries: 18, tone: "bg-warning-soft text-warning" },
  { name: "Category", icon: FolderTree, fields: 5, entries: 24, tone: "bg-primary-soft text-primary-soft-foreground" },
  { name: "FAQ", icon: HelpCircle, fields: 4, entries: 41, tone: "bg-info-soft text-info" },
  { name: "Testimonial", icon: Quote, fields: 6, entries: 27, tone: "bg-success-soft text-success" },
  { name: "Service", icon: Wrench, fields: 8, entries: 12, tone: "bg-warning-soft text-warning" },
];

export function EnginePage() {
  return (
    <div>
      <PageHeader
        title="Content types"
        description="Define the structure of your content."
        icon={<Database />}
        actions={
          <Link to="/advanced/engine/sample/schema">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New type
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Types" value="8" icon={<Database />} hint="across workspace" />
        <StatCard label="Entries" value="364" delta="+28" trend="up" icon={<Layers />} spark={spark(3)} />
        <StatCard label="Fields" value="64" icon={<FileText />} hint="reusable definitions" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TYPES.map((type) => (
          <Card
            key={type.name}
            className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className={`flex size-12 items-center justify-center rounded-xl ${type.tone}`}>
              <type.icon className="size-6" />
            </span>
            <div className="mt-4 font-display text-[15px] font-semibold">{type.name}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{type.fields} fields</span>
              <span className="size-1 rounded-full bg-border" />
              <span>{type.entries} entries</span>
            </div>
            <Separator className="my-4" />
            <div className="mt-auto flex items-center gap-2">
              <Link to="/advanced/engine/sample/schema" className="flex-1">
                <Button variant="soft" size="sm" className="w-full">
                  Edit schema
                </Button>
              </Link>
              <Link to="/advanced/engine/sample/collection" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Entries
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
