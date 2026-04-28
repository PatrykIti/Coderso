import { useMemo, useState } from "react";
import { AlertCircle, Eye, EyeOff, LockKeyhole } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { PasswordStrengthList } from "@/ui/auth/PasswordStrengthList";
import { isApiClientError } from "@/services/apiClient";
import { confirmPasswordReset } from "@/services/authClient";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

const hasNumber = (value: string) => /\\d/.test(value);
const hasSpecial = (value: string) => /[^a-zA-Z0-9]/.test(value);

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
    <AuthShell
      mobileBrand={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold">Coderso CMS</span>
          </div>
          <a className="text-sm text-muted-foreground" href="#">
            Need help?
          </a>
        </div>
      }
      footer={<p className="text-xs text-muted-foreground">© 2024 Coderso CMS.</p>}
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
          <form className="space-y-5" onSubmit={handleSubmit}>
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
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-password">
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <PasswordStrengthList rules={rules} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm-password">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
          <div className="text-center">
            <a
              className="text-sm text-muted-foreground hover:text-foreground"
              href={withAdminBasePath(basePath, "/login")}
            >
              Back to login
            </a>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
