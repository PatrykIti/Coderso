import { useState } from "react";
import { AlertCircle, Layers } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { AuthBrandPanel } from "@/ui/auth/AuthBrandPanel";
import { SsoButtons } from "@/ui/auth/SsoButtons";
import { isApiClientError } from "@/services/apiClient";
import { login, toFieldErrors } from "@/services/authClient";

type LoginPageProps = {
  initialEmail?: string;
  initialError?: string;
};

export function LoginPage({ initialEmail = "", initialError = "" }: LoginPageProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await login({ email, password });
      if (typeof window !== "undefined") {
        window.location.assign("/admin");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        setFieldErrors(toFieldErrors(err));
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      brand={<AuthBrandPanel />}
      mobileBrand={
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </span>
          <span className="text-2xl font-semibold">Nextless</span>
          <Badge variant="secondary">CMS</Badge>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a className="hover:text-foreground" href="#">
            Documentation
          </a>
          <a className="hover:text-foreground" href="#">
            Support
          </a>
          <a className="hover:text-foreground" href="#">
            Privacy Policy
          </a>
        </div>
      }
    >
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="space-y-2 text-center sm:text-left">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your workspace.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password ? (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(Boolean(checked))}
                />
                Remember me
              </label>
              <a className="text-primary hover:underline" href="#">
                Forgot password?
              </a>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="space-y-6">
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                Or continue with
              </span>
            </div>
            <SsoButtons />
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
