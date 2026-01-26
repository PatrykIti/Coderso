import { Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { AuthBrandPanel } from "@/ui/auth/AuthBrandPanel";
import { SsoButtons } from "@/ui/auth/SsoButtons";

export function LoginPage() {
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
          <form className="space-y-4">
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
              />
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
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox id="remember" />
                Remember me
              </label>
              <a className="text-primary hover:underline" href="#">
                Forgot password?
              </a>
            </div>
            <Button className="w-full" type="submit">
              Sign in
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
