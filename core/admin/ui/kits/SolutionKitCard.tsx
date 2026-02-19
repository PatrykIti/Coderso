import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SolutionKitSummary } from "@/services/solutionKitsClient";

type SolutionKitCardProps = {
  kit: SolutionKitSummary;
  isActive: boolean;
  onSelect: (id: SolutionKitSummary["id"]) => void;
};

export function SolutionKitCard({ kit, isActive, onSelect }: SolutionKitCardProps) {
  return (
    <Card className={isActive ? "border-primary/70 ring-1 ring-primary/30" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{kit.title}</CardTitle>
          <Badge variant="outline">Beta</Badge>
        </div>
        <CardDescription>{kit.shortDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommended modules
          </p>
          <div className="flex flex-wrap gap-2">
            {kit.recommendedModules.map((module) => (
              <Badge key={module} variant="secondary" className="capitalize">
                {module.replaceAll("-", " ")}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Highlights
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {kit.features.slice(0, 3).map((feature) => (
              <li key={feature}>- {feature}</li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant={isActive ? "default" : "outline"}
          className="w-full"
          onClick={() => onSelect(kit.id)}
        >
          {isActive ? "Selected" : "Select kit"}
        </Button>
      </CardFooter>
    </Card>
  );
}
