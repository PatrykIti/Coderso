import { Github, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/router";

export function LoginPage() {
  return (
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your Coderso workspace</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="gap-2">
          <Github className="size-4" /> GitHub
        </Button>
        <Button variant="outline" className="gap-2">
          <Mail className="size-4" /> Google
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or continue with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" defaultValue="patryk@coderso.dev" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/reset" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" defaultValue="prototype" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox defaultChecked /> Keep me signed in for 30 days
        </label>
        <Link to="/">
          <Button className="w-full" size="lg">
            Sign in
          </Button>
        </Link>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don’t have an account?{" "}
        <Link to="/reset/confirm" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}
