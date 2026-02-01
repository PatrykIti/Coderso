import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isApiClientError } from "@/services/apiClient";
import {
  activateAdminThemeProfile,
  listAdminThemeProfiles,
  type AdminThemeProfile,
} from "@/services/adminThemeClient";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

export function AdminThemeSwitcher() {
  const [profiles, setProfiles] = useState<AdminThemeProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAdminThemeProfiles();
      setProfiles(result.items);
      const active = result.items.find((profile) => profile.isActive);
      setActiveId(active?.id ?? result.items[0]?.id ?? null);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load admin themes.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshProfiles();
  }, []);

  const handleSelect = async (nextId: string) => {
    if (!nextId || nextId === activeId) return;
    setActiveId(nextId);
    try {
      await activateAdminThemeProfile(nextId);
      await refreshProfiles();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("theme:updated"));
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to switch theme profile.");
      }
    }
  };

  const activeProfile = profiles.find((profile) => profile.id === activeId) ?? null;
  const basePath = resolveAdminBasePath();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">{activeProfile?.name ?? "Theme"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Admin UI Theme</DropdownMenuLabel>
        {error ? (
          <DropdownMenuItem disabled>{error}</DropdownMenuItem>
        ) : null}
        <DropdownMenuRadioGroup value={activeId ?? ""} onValueChange={handleSelect}>
          {profiles.map((profile) => (
            <DropdownMenuRadioItem key={profile.id} value={profile.id}>
              {profile.name}
            </DropdownMenuRadioItem>
          ))}
          {profiles.length === 0 && !isLoading ? (
            <DropdownMenuItem disabled>No profiles yet</DropdownMenuItem>
          ) : null}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={withAdminBasePath(basePath, "/themes")}>Manage themes</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
