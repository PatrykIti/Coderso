import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Link } from "@/lib/router";

export function NotFoundPage() {
  return (
    <div className="py-10">
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        description="This prototype route doesn’t exist yet. Jump back to the dashboard or browse every screen."
        action={
          <div className="flex gap-2">
            <Link to="/">
              <Button>Go to dashboard</Button>
            </Link>
            <Link to="/screens">
              <Button variant="outline">All screens</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
