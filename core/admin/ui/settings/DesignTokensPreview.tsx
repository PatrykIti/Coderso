import { Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DesignTokensPreview() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="all" className="flex h-full flex-col">
        <div className="border-b px-6">
          <TabsList variant="line">
            <TabsTrigger value="all">All Components</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="buttons">Buttons</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all" className="flex-1">
          <ScrollArea className="h-full p-6">
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Typography scale</Badge>
                </div>
                <Card className="gap-4 p-6">
                  <div>
                    <h1 className="text-3xl font-bold">
                      Heading 1 - The quick brown fox
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      text-3xl / font-bold
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Heading 2 - Jumps over the lazy dog
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      text-2xl / font-semibold
                    </p>
                  </div>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    Body text shows default typography scale for long content.
                  </p>
                </Card>
              </section>
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Interactive elements</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="gap-4 p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Buttons
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm">Primary</Button>
                      <Button variant="secondary" size="sm">
                        Secondary
                      </Button>
                      <Button variant="outline" size="sm">
                        Outline
                      </Button>
                      <Button variant="ghost" size="sm">
                        Ghost
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="destructive" size="sm">
                        Destructive
                      </Button>
                      <Button variant="outline" size="sm">
                        Tinted
                      </Button>
                    </div>
                  </Card>
                  <Card className="gap-4 p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Forms
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Email address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            defaultValue="hello@nextless.com"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox defaultChecked />
                        Remember me
                      </label>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">Notifications</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </Card>
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="typography" className="flex-1">
          <ScrollArea className="h-full p-6">
            <Card className="gap-4 p-6">
              <h1 className="text-4xl font-bold">Aa Heading 1</h1>
              <h2 className="text-2xl font-semibold">Heading 2</h2>
              <p className="text-sm text-muted-foreground">
                Body text sample for paragraph styling.
              </p>
            </Card>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="buttons" className="flex-1">
          <ScrollArea className="h-full p-6">
            <Card className="gap-4 p-6">
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Primary</Button>
                <Button variant="secondary" size="sm">
                  Secondary
                </Button>
                <Button variant="outline" size="sm">
                  Outline
                </Button>
                <Button variant="ghost" size="sm">
                  Ghost
                </Button>
              </div>
            </Card>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="forms" className="flex-1">
          <ScrollArea className="h-full p-6">
            <Card className="gap-4 p-6">
              <Input placeholder="Input field" />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox />
                Checkbox
              </label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Toggle</span>
                <Switch />
              </div>
            </Card>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
