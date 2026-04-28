import { Palette } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminLink } from "@/ui/shared/AdminLink";
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
  getCachedAdminThemeProfiles,
  listAdminThemeProfilesCached,
  type AdminThemeProfile,
} from "@/services/adminThemeClient";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

const resolveActiveProfileId = (profiles: AdminThemeProfile[]) => {
  const active = profiles.find((profile) => profile.isActive);
  return active?.id ?? profiles[0]?.id ?? null;
};

export function AdminThemeSwitcher() {
  const initialCachedProfiles = getCachedAdminThemeProfiles() ?? [];
  const [profiles, setProfiles] = useState<AdminThemeProfile[]>(initialCachedProfiles);
  const [activeId, setActiveId] = useState<string | null>(
    resolveActiveProfileId(initialCachedProfiles)
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshProfiles = useCallback(async (options?: { force?: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listAdminThemeProfilesCached({ force: options?.force });
      setProfiles(items);
      setActiveId(resolveActiveProfileId(items));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load admin themes.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;
    setIsLoading(true);
    setError(null);
    listAdminThemeProfilesCached()
      .then((items) => {
        setProfiles(items);
        setActiveId(resolveActiveProfileId(items));
      })
      .catch((err) => {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load admin themes.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  const handleSelect = async (nextId: string) => {
    if (!nextId || nextId === activeId) return;
    setActiveId(nextId);
    try {
      await activateAdminThemeProfile(nextId);
      await refreshProfiles({ force: true });
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
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
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
          <AdminLink href={withAdminBasePath(basePath, "/themes")}>Manage themes</AdminLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
