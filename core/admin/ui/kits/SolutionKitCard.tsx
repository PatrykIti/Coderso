import {
  Boxes,
  Car,
  Check,
  ListChecks,
  type LucideIcon,
  Scissors,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SolutionKitId, SolutionKitSummary } from "@/services/solutionKitsClient";

type SolutionKitCardProps = {
  kit: SolutionKitSummary;
  isActive: boolean;
  onSelect: (id: SolutionKitSummary["id"]) => void;
};

type KitVisual = { icon: LucideIcon; tone: string };

// TASK-479-21-L01: per-kit icon + soft tone, derived deterministically at render
// time from the real `SolutionKitId` catalog (no new API). Tone tokens (`-soft`
// backgrounds + accent text) come from TASK-479-05; consumed only here.
const KIT_VISUALS: Record<SolutionKitId, KitVisual> = {
  "automotive-workshop": { icon: Car, tone: "bg-warning-soft text-warning" },
  "medical-clinic": { icon: Stethoscope, tone: "bg-info-soft text-info" },
  "beauty-salon": { icon: Scissors, tone: "bg-primary-soft text-primary" },
  "local-service-business": { icon: Boxes, tone: "bg-muted text-muted-foreground" },
  "services-directory": { icon: ListChecks, tone: "bg-success-soft text-success" },
  "small-ecommerce": { icon: ShoppingBag, tone: "bg-primary-soft text-primary" },
};

const visualFor = (id: SolutionKitId): KitVisual => KIT_VISUALS[id];

export function SolutionKitCard({ kit, isActive, onSelect }: SolutionKitCardProps) {
  const { icon: Icon, tone } = visualFor(kit.id);

  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-0 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-card",
        isActive && "border-primary/70 ring-1 ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex size-12 items-center justify-center rounded-2xl", tone)}>
          <Icon className="size-6" />
        </span>
        {isActive ? (
          <Badge variant="success">
            <Check className="size-3" /> Selected
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 font-display text-[15px] font-semibold">{kit.title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{kit.shortDescription}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {kit.recommendedModules.slice(0, 4).map((module) => (
          <Badge key={module} variant="outline" className="capitalize">
            {module.replaceAll("-", " ")}
          </Badge>
        ))}
      </div>

      <Button
        variant={isActive ? "soft" : "outline"}
        size="sm"
        className="mt-auto w-full"
        onClick={() => onSelect(kit.id)}
      >
        {isActive ? "Selected" : "Select kit"}
      </Button>
    </Card>
  );
}
