import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

type InfoBannerProps = {
  title: string;
  description: string;
};

export function InfoBanner({ title, description }: InfoBannerProps) {
  return (
    <Alert className="border-primary/20 bg-primary/10 text-primary">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4" />
        <div>
          <p className="text-sm font-semibold text-primary">{title}</p>
          <AlertDescription className="text-primary/80">
            {description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
