import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Eye, EyeOff, Rocket } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { PasswordStrengthList } from "@/ui/auth/PasswordStrengthList";
import { isApiClientError } from "@/services/apiClient";
import { createInstallAdmin, type InstalledUser } from "@/services/installClient";
import {
  evaluatePasswordRules,
  validateInstaller,
  type InstallerForm,
} from "@/ui/setup/installerValidation";
import { cn } from "@/lib/utils";

// Mirror SetPasswordPage's caller-driven strength meter tones (the frozen
// Progress primitive has no `tone` prop; recolor its indicator from the caller).
type StrengthTone = "destructive" | "warning" | "success";

const STRENGTH_INDICATOR: Record<StrengthTone, string> = {
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
};

// Map the installer route's domain codes (01-L02 / 02-L02) + rate limit to
// human copy. `install_unavailable` (409) means someone else finished setup.
const mapInstallClientError = (error: unknown): string => {
  if (isApiClientError(error)) {
    if (error.code === "install_unavailable" || error.status === 409) {
      return "This site is already set up. Please log in instead.";
    }
    if (error.status === 429) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (error.code === "install_admin_invalid") {
      return "Some details are invalid. Please review the form and try again.";
    }
    return error.message;
  }
  return "Unable to create your admin account. Please try again.";
};

const EMPTY_FORM: InstallerForm = { name: "", email: "", password: "", confirm: "" };

export function InstallerWizard({ onInstalled }: { onInstalled: (user: InstalledUser) => void }) {
  const [form, setForm] = useState<InstallerForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Secret handling: clear the password fields from component state on unmount;
  // they are never persisted to localStorage / theme cache / logs.
  useEffect(() => {
    return () => {
      setForm(EMPTY_FORM);
    };
  }, []);

  const setField = (field: keyof InstallerForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const strengthRules = useMemo(() => evaluatePasswordRules(form.password), [form.password]);
  const fieldError = validateInstaller(form);

  // Derived render-time from the existing rules (no extra state).
  const score = strengthRules.filter((rule) => rule.met).length;
  const strength: { value: number; tone: StrengthTone; label: string } =
    score >= 3
      ? { value: 100, tone: "success", label: "Strong" }
      : score === 2
        ? { value: 66, tone: "warning", label: "Medium" }
        : { value: 33, tone: "destructive", label: "Weak" };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const invalid = validateInstaller(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    try {
      const { user } = await createInstallAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      onInstalled(user);
    } catch (err) {
      setError(mapInstallClientError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell>
      <Card className="p-7 shadow-card">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Rocket className="size-6" />
          </span>
          <h2 className="font-display text-xl font-semibold">Create your admin account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up the first administrator to finish installing Coderso.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="installer-name">
              Name
            </label>
            <Input
              id="installer-name"
              name="name"
              type="text"
              placeholder="Ada Lovelace"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setField("name")(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="installer-email">
              Email
            </label>
            <Input
              id="installer-email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setField("email")(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="installer-password">
              Password
            </label>
            <div className="relative">
              <Input
                id="installer-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setField("password")(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress
              value={strength.value}
              className={cn("flex-1", STRENGTH_INDICATOR[strength.tone])}
            />
            <span className="text-sm text-muted-foreground">{strength.label}</span>
          </div>
          <PasswordStrengthList rules={strengthRules} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="installer-confirm">
              Confirm password
            </label>
            <div className="relative">
              <Input
                id="installer-confirm"
                name="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(event) => setField("confirm")(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={saving || Boolean(fieldError)}
          >
            {saving ? "Creating account..." : "Create admin account"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
