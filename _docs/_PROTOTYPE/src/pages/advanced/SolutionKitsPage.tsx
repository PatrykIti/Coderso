import {
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  HeartHandshake,
  Newspaper,
  Rocket,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const KITS = [
  {
    name: "Restaurant",
    icon: UtensilsCrossed,
    tone: "bg-warning-soft text-warning",
    description: "Menus, reservations, and a mouth-watering landing page.",
    includes: ["8 pages", "12 widgets", "5 types"],
    active: true,
  },
  {
    name: "SaaS Landing",
    icon: Rocket,
    tone: "bg-primary-soft text-primary-soft-foreground",
    description: "Hero, features, pricing, and a high-converting CTA flow.",
    includes: ["6 pages", "14 widgets", "3 types"],
  },
  {
    name: "Portfolio",
    icon: Briefcase,
    tone: "bg-info-soft text-info",
    description: "Showcase projects with elegant galleries and case studies.",
    includes: ["5 pages", "9 widgets", "4 types"],
  },
  {
    name: "Agency",
    icon: Building2,
    tone: "bg-success-soft text-success",
    description: "Services, team, and testimonials for studios and agencies.",
    includes: ["7 pages", "11 widgets", "5 types"],
  },
  {
    name: "Online Store",
    icon: ShoppingBag,
    tone: "bg-primary-soft text-primary-soft-foreground",
    description: "Product grids, collections, and a streamlined checkout.",
    includes: ["9 pages", "16 widgets", "6 types"],
  },
  {
    name: "Blog",
    icon: Newspaper,
    tone: "bg-info-soft text-info",
    description: "Article layouts, categories, and an inviting reading flow.",
    includes: ["4 pages", "8 widgets", "3 types"],
  },
  {
    name: "Events",
    icon: CalendarDays,
    tone: "bg-warning-soft text-warning",
    description: "Schedules, speakers, and ticketing for conferences.",
    includes: ["6 pages", "10 widgets", "4 types"],
  },
  {
    name: "Nonprofit",
    icon: HeartHandshake,
    tone: "bg-success-soft text-success",
    description: "Donations, causes, and volunteer sign-ups that inspire.",
    includes: ["5 pages", "9 widgets", "4 types"],
  },
];

export function SolutionKitsPage() {
  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Solution kits
            <Badge variant="soft">Beta</Badge>
          </span>
        }
        description="Curated, AI-assembled starting points for an entire site."
      />

      {/* Featured banner */}
      <Card className="relative mb-6 overflow-hidden border-0 bg-primary p-7 text-primary-foreground shadow-card">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-lg">
          <Badge className="mb-3 border-white/20 bg-white/15 text-white">
            <Sparkles className="size-3" /> AI assembled
          </Badge>
          <h2 className="font-display text-2xl font-bold">Launch a full site in minutes</h2>
          <p className="mt-1.5 text-sm text-white/80">
            Pick a kit and Coderso scaffolds pages, widgets, and content types — ready to customize.
          </p>
          <Button variant="soft" className="mt-4 bg-white text-primary hover:bg-white/90">
            Browse all kits
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {KITS.map((kit) => (
          <Card key={kit.name} className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between">
              <span className={`flex size-12 items-center justify-center rounded-2xl ${kit.tone}`}>
                <kit.icon className="size-6" />
              </span>
              {kit.active ? (
                <Badge variant="success">
                  <Check className="size-3" /> Active
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 font-display text-[15px] font-semibold">{kit.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">{kit.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {kit.includes.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>

            <Button variant="soft" size="sm" className="mt-4 w-full">
              {kit.active ? "Re-apply kit" : "Apply kit"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
