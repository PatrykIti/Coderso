import { Bell, Command, HelpCircle, LogOut, Menu, Plus, Search, Settings, User } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Link } from "@/lib/router";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>

      <button
        type="button"
        className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-soft transition-colors hover:border-ring/60"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="hidden items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium sm:flex">
          <Command className="size-3" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="default" size="sm" className="hidden gap-1.5 sm:inline-flex">
          <Plus className="size-4" />
          Create
        </Button>

        <ThemeToggle />

        <Dropdown
          trigger={
            <span className="relative flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground">
              <Bell className="size-4.5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
            </span>
          }
          className="min-w-72"
        >
          <DropdownLabel>Notifications</DropdownLabel>
          <DropdownItem icon={<User />}>New user awaiting approval</DropdownItem>
          <DropdownItem icon={<Bell />}>Backup completed successfully</DropdownItem>
          <DropdownItem icon={<Settings />}>Plugin update available</DropdownItem>
          <DropdownSeparator />
          <DropdownItem>View all notifications</DropdownItem>
        </Dropdown>

        <Dropdown
          trigger={
            <span className="flex items-center gap-2 rounded-xl p-0.5 pr-1 transition-colors hover:bg-accent">
              <Avatar name="Patryk C" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm font-medium">Patryk C.</span>
                <span className="block text-xs text-muted-foreground">Owner</span>
              </span>
            </span>
          }
          className="min-w-56"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar name="Patryk C" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Patryk Ciechański</div>
              <div className="truncate text-xs text-muted-foreground">patryk@coderso.dev</div>
            </div>
            <Badge variant="soft" className="ml-auto">
              Owner
            </Badge>
          </div>
          <DropdownSeparator />
          <DropdownItem icon={<User />}>Profile</DropdownItem>
          <Link to="/settings">
            <DropdownItem icon={<Settings />}>Settings</DropdownItem>
          </Link>
          <DropdownItem icon={<HelpCircle />}>Help &amp; support</DropdownItem>
          <DropdownSeparator />
          <Link to="/login">
            <DropdownItem icon={<LogOut />} destructive>
              Sign out
            </DropdownItem>
          </Link>
        </Dropdown>
      </div>
    </header>
  );
}
