import { Eye, EyeOff, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { PasswordStrengthList } from "@/ui/auth/PasswordStrengthList";

const defaultRules = [
  { label: "At least 8 characters", met: true },
  { label: "At least 1 number", met: false },
  { label: "At least 1 special character", met: false },
];

export function SetPasswordPage() {
  return (
    <AuthShell
      mobileBrand={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold">Nextless CMS</span>
          </div>
          <a className="text-sm text-muted-foreground" href="#">
            Need help?
          </a>
        </div>
      }
      footer={<p className="text-xs text-muted-foreground">© 2024 Nextless CMS.</p>}
    >
      <Card className="border-border/60 shadow-lg">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold">Set new password</h1>
            <p className="text-sm text-muted-foreground">
              Your new password must be different from previous passwords.
            </p>
          </div>
          <form className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-password">
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
            <PasswordStrengthList rules={defaultRules} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm-password">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Button className="w-full" type="submit">
              Update password
            </Button>
          </form>
          <div className="text-center">
            <a className="text-sm text-muted-foreground hover:text-foreground" href="#">
              Back to login
            </a>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
