import { ArrowLeft, PanelLeft, PanelRight, Save, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createCommerceProduct,
  getCachedCommerceProduct,
  getCommerceProductCached,
  listCommerceCollectionsCached,
  type CommerceCollectionRecord,
  type CommerceProductRecord,
  updateCommerceProduct,
} from "@/services/commerceClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { CommerceCollectionsPanel } from "./components/CommerceCollectionsPanel";
import { CommerceContextPanel } from "./components/CommerceContextPanel";
import { CommerceEditorSections } from "./components/CommerceEditorSections";
import {
  createEmptyCommerceDraft,
  draftFromCommerceProduct,
  toCommerceProductInput,
  type CommerceProductDraft,
} from "./commerceEditorModel";

const resolveCommerceId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "commerce");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

const cloneDraft = (draft: CommerceProductDraft): CommerceProductDraft => ({
  ...draft,
  collectionIds: [...draft.collectionIds],
  variants: draft.variants.map((variant) => ({
    ...variant,
    attributes: { ...variant.attributes },
    pricing: { ...variant.pricing },
    stock: { ...variant.stock },
  })),
  metadata: { ...draft.metadata },
  data: { ...draft.data },
});

export function CommerceEditorPage() {
  const { navigate } = useAdminRouter();
  const [productId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveCommerceId(window.location.pathname);
  });
  const isCreateMode = !productId || productId === "new";

  const [product, setProduct] = useState<CommerceProductRecord | null>(() => {
    if (isCreateMode || !productId) return null;
    return getCachedCommerceProduct(productId) ?? null;
  });
  const [collections, setCollections] = useState<CommerceCollectionRecord[]>([]);
  const [draft, setDraft] = useState<CommerceProductDraft>(() => {
    if (isCreateMode || !productId) return createEmptyCommerceDraft();
    const cached = getCachedCommerceProduct(productId);
    return cached ? draftFromCommerceProduct(cached) : createEmptyCommerceDraft();
  });
  const [snapshot, setSnapshot] = useState<CommerceProductDraft>(() => cloneDraft(draft));

  const [isLoading, setIsLoading] = useState(() => !isCreateMode && !product);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const applyProduct = useCallback((item: CommerceProductRecord) => {
    const nextDraft = draftFromCommerceProduct(item);
    setProduct(item);
    setDraft(nextDraft);
    setSnapshot(cloneDraft(nextDraft));
    setHasUnsavedChanges(false);
  }, []);

  const refreshProduct = useCallback(
    async (force?: boolean) => {
      if (!productId || isCreateMode) return;
      const item = await getCommerceProductCached(productId, { force });
      if (item) applyProduct(item);
    },
    [applyProduct, isCreateMode, productId]
  );

  useEffect(() => {
    let active = true;
    listCommerceCollectionsCached({ force: true })
      .then((items) => {
        if (active) setCollections(items);
      })
      .catch((error) => {
        if (!active) return;
        setError(isApiClientError(error) ? error.message : "Failed to load commerce collections.");
      })
      .finally(() => {
        if (!active) return;
        if (isCreateMode) setIsLoading(false);
      });

    if (!isCreateMode && productId) {
      getCommerceProductCached(productId, { force: true })
        .then((item) => {
          if (!active || !item) return;
          applyProduct(item);
        })
        .catch((error) => {
          if (!active) return;
          setError(isApiClientError(error) ? error.message : "Failed to load commerce product.");
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [applyProduct, isCreateMode, productId]);

  useEffect(() => {
    if (!productId || isCreateMode) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.commerceProductsList) return;
      if (hasUnsavedChanges) return;
      refreshProduct(true).catch(() => undefined);
    });
  }, [hasUnsavedChanges, isCreateMode, productId, refreshProduct]);

  const patchDraft = (patch: Partial<CommerceProductDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setHasUnsavedChanges(true);
    setSuccess(null);
  };

  const toggleCollection = (collectionId: string, checked: boolean) => {
    setDraft((current) => {
      const set = new Set(current.collectionIds);
      if (checked) set.add(collectionId);
      else set.delete(collectionId);
      return { ...current, collectionIds: Array.from(set) };
    });
    setHasUnsavedChanges(true);
    setSuccess(null);
  };

  const handleSave = async (statusOverride?: CommerceProductDraft["status"]) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = toCommerceProductInput({
      ...draft,
      ...(statusOverride ? { status: statusOverride } : {}),
    });

    try {
      if (isCreateMode) {
        const created = await createCommerceProduct(payload);
        applyProduct(created);
        navigate(`/advanced/commerce/${encodeURIComponent(created.id)}`);
      } else if (productId) {
        const updated = await updateCommerceProduct(productId, payload);
        applyProduct(updated);
      }
      setSuccess("Product saved successfully.");
    } catch (error) {
      setError(isApiClientError(error) ? error.message : "Failed to save commerce product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(cloneDraft(snapshot));
    setHasUnsavedChanges(false);
    setSuccess(null);
    setError(null);
  };

  const publishButtonLabel = useMemo(() => {
    if (draft.status === "published") return "Move to draft";
    return "Publish";
  }, [draft.status]);

  const publishTargetStatus = draft.status === "published" ? "draft" : "published";

  const leftPanel = (
    <CommerceContextPanel
      isCreateMode={isCreateMode}
      draft={draft}
      product={product}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );

  const rightPanel = (
    <CommerceCollectionsPanel
      collections={collections}
      selectedIds={draft.collectionIds}
      status={draft.status}
      pricingAmount={draft.pricingAmount}
      pricingCompareAtAmount={draft.pricingCompareAtAmount}
      pricingCurrency={draft.pricingCurrency}
      publishButtonLabel={publishButtonLabel}
      isSaving={isSaving}
      onToggleCollection={toggleCollection}
      onStatusChange={(status) => patchDraft({ status })}
      onPublish={() => handleSave(publishTargetStatus)}
    />
  );

  if (isLoading) {
    return (
      <EditorShell
        activeHref="/admin/advanced/commerce"
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      >
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Loading product editor...
        </div>
      </EditorShell>
    );
  }

  return (
    <EditorShell
      activeHref="/admin/advanced/commerce"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      breadcrumbs={["Coderso", "Commerce", isCreateMode ? "New product" : draft.title || "Editor"]}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {isCreateMode ? "New product" : "Edit product"}
              </h1>
              {hasUnsavedChanges ? <Badge variant="soft">Unsaved changes</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Configure product identity, pricing, stock, and collection assignments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2 lg:hidden"
              onClick={() => setMobileContextOpen(true)}
            >
              <PanelLeft className="h-4 w-4" />
              Context
            </Button>
            <Button
              variant="ghost"
              className="gap-2 lg:hidden"
              onClick={() => setMobileDetailsOpen(true)}
            >
              <PanelRight className="h-4 w-4" />
              Details
            </Button>
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate("/advanced/commerce")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDiscard}
              disabled={!hasUnsavedChanges}
            >
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleSave(publishTargetStatus)}
              disabled={isSaving}
            >
              <Send className="h-4 w-4" />
              {publishButtonLabel}
            </Button>
            <Button className="gap-2" onClick={() => handleSave()} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Commerce editor error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <CommerceEditorSections draft={draft} onChange={patchDraft} />
      </div>

      <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
        <SheetContent side="left" className="w-[22rem] p-0">
          <SheetTitle className="sr-only">Product context</SheetTitle>
          <SheetDescription className="sr-only">
            Context and lifecycle details for the current product.
          </SheetDescription>
          {leftPanel}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="right" className="w-[22rem] p-0">
          <SheetTitle className="sr-only">Product details panel</SheetTitle>
          <SheetDescription className="sr-only">
            Product collections and media IDs.
          </SheetDescription>
          {rightPanel}
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
