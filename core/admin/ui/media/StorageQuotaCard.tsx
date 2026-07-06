import { HardDrive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/ui/shared/SectionCard";

import { formatBytes } from "./utils";

type StorageQuotaCardProps = {
  usedBytes: number;
  totalBytes: number | null;
  planLabel: string | null;
  assetCount: number;
  className?: string;
  onManagePlan?: () => void;
};

/**
 * TASK-512-05: prototype-faithful storage card
 * (`_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx:80-96`). Reuses the shipped
 * `SectionCard` (icon/title/description/action header) + Radix `Progress`
 * (token-driven `bg-primary` indicator) rather than hand-rolling a bar. When
 * `totalBytes` is null the card degrades gracefully to a count-only description
 * with NO progress bar / footer (unlimited/no quota configured).
 */
export function StorageQuotaCard({
  usedBytes,
  totalBytes,
  planLabel,
  assetCount,
  className,
  onManagePlan,
}: StorageQuotaCardProps) {
  const hasQuota = typeof totalBytes === "number" && Number.isFinite(totalBytes) && totalBytes > 0;
  const pct = hasQuota ? Math.min(100, Math.max(0, (usedBytes / (totalBytes as number)) * 100)) : 0;
  const available = hasQuota ? Math.max(0, (totalBytes as number) - usedBytes) : 0;

  const description = hasQuota
    ? `${formatBytes(usedBytes)} of ${formatBytes(totalBytes as number)} used`
    : `${assetCount} ${assetCount === 1 ? "asset" : "assets"} · ${formatBytes(usedBytes)}`;

  return (
    <SectionCard
      title="Storage"
      description={description}
      icon={<HardDrive className="size-4" />}
      className={className}
      action={
        <Button variant="outline" size="sm" onClick={onManagePlan}>
          {planLabel ?? "Manage plan"}
        </Button>
      }
    >
      {hasQuota ? (
        <>
          <Progress value={pct} className="h-2.5" />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{`${Math.round(pct)}% used`}</span>
            <span className="tabular-nums">{`${formatBytes(available)} available`}</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          No storage quota configured. Set a plan in Media settings to track usage.
        </p>
      )}
    </SectionCard>
  );
}
