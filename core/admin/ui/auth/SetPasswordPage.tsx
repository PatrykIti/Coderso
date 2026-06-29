import { useMemo, useState } from "react";
import { AlertCircle, Eye, EyeOff, LockKeyhole } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { PasswordStrengthList } from "@/ui/auth/PasswordStrengthList";
import { isApiClientError } from "@/services/apiClient";
import { confirmPasswordReset } from "@/services/authClient";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";
import { cn } from "@/lib/utils";

const hasNumber = (value: string) => /\d/.test(value);
const hasSpecial = (value: string) => /[^a-zA-Z0-9]/.test(value);

// TASK-479-29-L02: the frozen 06 `Progress` primitive has no `tone`/`variant`
// prop (its indicator is hardcoded `bg-primary`). Per the shared-contract limit
// rule, do NOT edit the frozen primitive — recolor the indicator from the
// caller via a token-driven descendant utility, giving the prototype's
// weak/medium/strong meter tones without a new primitive prop.
type StrengthTone = "destructive" | "warning" | "success";

const STRENGTH_INDICATOR: Record<StrengthTone, string> = {
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
};

const resolveToken = (token?: string) => {
  if (token) return token;
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
};

type SetPasswordPageProps = {
  token?: string;
  initialError?: string;
};

export function SetPasswordPage({ token, initialError = "" }: SetPasswordPageProps) {
  const basePath = resolveAdminBasePath();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(false);
  const resetToken = useMemo(() => resolveToken(token), [token]);

  const rules = useMemo(
    () => [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "At least 1 number", met: hasNumber(password) },
      { label: "At least 1 special character", met: hasSpecial(password) },
    ],
    [password]
  );

  // Derived render-time from the EXISTING rules — no new logic, no extra state.
  const score = rules.filter((rule) => rule.met).length;
  const strength: { value: number; tone: StrengthTone; label: string } =
    score >= 3
      ? { value: 100, tone: "success", label: "Strong" }
      : score === 2
        ? { value: 66, tone: "warning", label: "Medium" }
        : { value: 33, tone: "destructive", label: "Weak" };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!resetToken) {
      setError("Reset token is missing or expired.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ token: resetToken, password });
      setSuccess(true);
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.assign(withAdminBasePath(basePath, "/login"));
        }, 1200);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Unable to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="p-7 shadow-card">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="size-6" />
          </span>
          <h2 className="font-display text-xl font-semibold">Set new password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert>
              <AlertDescription>Password updated successfully.</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="new-password">
              New password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
          <PasswordStrengthList rules={rules} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="confirm-password">
              Confirm password
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </div>
          </div>
          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
        <p className="mt-5 text-center">
          <a
            className="text-sm font-medium text-primary hover:underline"
            href={withAdminBasePath(basePath, "/login")}
          >
            Back to login
          </a>
        </p>
      </Card>
    </AuthShell>
  );
}
