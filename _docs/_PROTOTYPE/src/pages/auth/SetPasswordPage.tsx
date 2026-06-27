import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/router";
import { cn } from "@/lib/cn";

const REQUIREMENTS = [
  { label: "8+ characters", met: true },
  { label: "One number", met: true },
  { label: "One symbol", met: false },
];

export function SetPasswordPage() {
  return (
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Create a new password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" placeholder="••••••••" defaultValue="prototype9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" placeholder="••••••••" defaultValue="prototype9" />
        </div>

        <div className="flex items-center gap-3">
          <Progress value={70} tone="success" className="flex-1" />
          <span className="text-sm text-muted-foreground">Strong</span>
        </div>

        <ul className="flex flex-col gap-1.5">
          {REQUIREMENTS.map((req) => (
            <li
              key={req.label}
              className={cn(
                "flex items-center gap-2 text-sm",
                req.met ? "text-success" : "text-muted-foreground",
              )}
            >
              <Check className="size-4" /> {req.label}
            </li>
          ))}
        </ul>

        <Link to="/login">
          <Button className="w-full" size="lg">
            Set password
          </Button>
        </Link>
      </form>
    </Card>
  );
}
