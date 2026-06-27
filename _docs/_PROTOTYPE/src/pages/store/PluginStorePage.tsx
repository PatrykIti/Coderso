import {
  BarChart3,
  Calendar,
  Check,
  Globe,
  Mail,
  MessageSquare,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";

const PLUGINS = [
  { name: "Analytics Pro", author: "Coderso", icon: BarChart3, rating: 4.9, installs: "12k", price: "Free", installed: true, tone: "bg-violet-100 text-violet-700" },
  { name: "SEO Toolkit", author: "Coderso", icon: Globe, rating: 4.8, installs: "9.4k", price: "Free", tone: "bg-emerald-100 text-emerald-700" },
  { name: "Mailchimp Sync", author: "Mailchimp", icon: Mail, rating: 4.6, installs: "7.1k", price: "$9/mo", tone: "bg-amber-100 text-amber-700" },
  { name: "Live Chat", author: "Crisp", icon: MessageSquare, rating: 4.7, installs: "6.8k", price: "Free", tone: "bg-sky-100 text-sky-700" },
  { name: "Bookings", author: "Coderso Labs", icon: Calendar, rating: 4.5, installs: "5.2k", price: "$12/mo", tone: "bg-rose-100 text-rose-700" },
  { name: "Stripe Checkout", author: "Stripe", icon: ShoppingCart, rating: 4.9, installs: "11k", price: "Free", tone: "bg-indigo-100 text-indigo-700" },
  { name: "Speed Boost", author: "Coderso", icon: Zap, rating: 4.4, installs: "3.9k", price: "$5/mo", tone: "bg-teal-100 text-teal-700" },
  { name: "AI Writer", author: "Coderso AI", icon: Sparkles, rating: 4.8, installs: "8.7k", price: "Beta", tone: "bg-fuchsia-100 text-fuchsia-700" },
];

export function PluginStorePage() {
  return (
    <div>
      <PageHeader
        title="Plugin store"
        description="Extend Coderso with integrations, tools, and themes."
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search plugins…" className="pl-9" />
          </div>
        }
      />

      {/* Featured */}
      <Card className="relative mb-6 overflow-hidden border-0 bg-primary p-7 text-primary-foreground shadow-card">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-lg">
          <Badge className="mb-3 border-white/20 bg-white/15 text-white">Featured</Badge>
          <h2 className="font-display text-2xl font-bold">AI Writer for Coderso</h2>
          <p className="mt-1.5 text-sm text-white/80">
            Draft posts, generate alt-text, and translate content in seconds — right inside the editor.
          </p>
          <Button variant="soft" className="mt-4 bg-white text-primary hover:bg-white/90">
            Install plugin
          </Button>
        </div>
      </Card>

      <div className="mb-5">
        <Tabs
          items={[
            { value: "all", label: "All" },
            { value: "analytics", label: "Analytics" },
            { value: "marketing", label: "Marketing" },
            { value: "commerce", label: "Commerce" },
            { value: "ai", label: "AI" },
            { value: "themes", label: "Themes" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PLUGINS.map((plugin) => (
          <Link key={plugin.name} to="/store/plugins/sample">
            <Card className="group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex items-start justify-between">
                <span className={`flex size-12 items-center justify-center rounded-2xl ${plugin.tone}`}>
                  <plugin.icon className="size-6" />
                </span>
                {plugin.installed ? (
                  <Badge variant="success">
                    <Check className="size-3" /> Installed
                  </Badge>
                ) : (
                  <Badge variant="outline">{plugin.price}</Badge>
                )}
              </div>
              <div className="mt-4 font-display text-[15px] font-semibold">{plugin.name}</div>
              <div className="text-xs text-muted-foreground">by {plugin.author}</div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-warning text-warning" /> {plugin.rating}
                </span>
                <span>{plugin.installs} installs</span>
              </div>
              <Button
                variant={plugin.installed ? "outline" : "soft"}
                size="sm"
                className="mt-4 w-full"
              >
                {plugin.installed ? "Manage" : "Install"}
              </Button>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
