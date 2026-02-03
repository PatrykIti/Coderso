import { Link2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

type BaseUrlCardProps = {
  adminBaseUrl: string;
  publicBaseUrl: string;
  errors?: { adminBaseUrl?: string | null; publicBaseUrl?: string | null };
  onChange?: (next: { adminBaseUrl: string; publicBaseUrl: string }) => void;
  disabled?: boolean;
};

export function BaseUrlCard({
  adminBaseUrl,
  publicBaseUrl,
  errors,
  onChange,
  disabled = false,
}: BaseUrlCardProps) {
  const adminError = errors?.adminBaseUrl ?? null;
  const publicError = errors?.publicBaseUrl ?? null;

  const handleAdminChange = (value: string) => {
    onChange?.({ adminBaseUrl: value, publicBaseUrl });
  };

  const handlePublicChange = (value: string) => {
    onChange?.({ adminBaseUrl, publicBaseUrl: value });
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Base URLs</CardTitle>
            <CardDescription>
              Point the admin panel and public site to their own domains.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="admin-base-url">
              Admin panel base URL
            </label>
            <Input
              id="admin-base-url"
              value={adminBaseUrl}
              placeholder="https://cms.example.com"
              onChange={(event) => handleAdminChange(event.target.value)}
              disabled={disabled}
              aria-invalid={adminError ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the current host for /admin.
            </p>
            {adminError ? (
              <p className="text-xs text-destructive">{adminError}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="public-base-url">
              Public site URL
            </label>
            <Input
              id="public-base-url"
              value={publicBaseUrl}
              placeholder="https://www.example.com"
              onChange={(event) => handlePublicChange(event.target.value)}
              disabled={disabled}
              aria-invalid={publicError ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Used for preview URLs and public routing.
            </p>
            {publicError ? (
              <p className="text-xs text-destructive">{publicError}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
