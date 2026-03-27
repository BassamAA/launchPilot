"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import { BusinessProfile } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { BRAND_NAME } from "@/lib/brand";

interface BusinessProfilePanelProps {
  siteId: string;
  profile: BusinessProfile | null;
  sourcesJson?: Record<string, unknown> | null;
}

export function BusinessProfilePanel({
  siteId,
  profile,
  sourcesJson,
}: BusinessProfilePanelProps) {
  const { toast } = useToast();
  const [audience, setAudience] = useState(profile?.target_audience || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [businessType, setBusinessType] = useState(profile?.business_type || "");
  const [monetizationModel, setMonetizationModel] = useState(profile?.monetization_model || "");
  const [saving, setSaving] = useState(false);

  const sourceEntries = useMemo(
    () =>
      Object.entries((sourcesJson || {}) as Record<
        string,
        { analyzed?: boolean; raw_data?: Record<string, unknown> }
      >),
    [sourcesJson]
  );

  const sourceHealth = useMemo(() => {
    const analyzed = sourceEntries.filter(([, value]) => value?.analyzed).length;
    const limited = sourceEntries.length - analyzed;
    const goodEnough = Boolean(
      (profile?.business_name || "").trim() &&
        (audience || profile?.target_audience || "").trim() &&
        ((profile?.offerings || []).length > 0 || (description || profile?.description || "").trim())
    );
    return { analyzed, limited, goodEnough };
  }, [sourceEntries, profile, audience, description]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/business-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_audience: audience,
          description,
          business_type: businessType,
          monetization_model: monetizationModel,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to update business profile");
      }

      toast("Business profile updated.", "success");
      window.location.reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update business profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Business Profile</h2>
            <Badge variant={sourceHealth.goodEnough ? "success" : "warning"}>
              {sourceHealth.goodEnough ? "Strategy-ready" : "Needs enrichment"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manual enrichment for weaker social-only businesses. {BRAND_NAME} uses this profile in surfaces, planning, and future strategy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{sourceHealth.analyzed} analyzed</Badge>
          <Badge variant={sourceHealth.limited > 0 ? "warning" : "default"}>
            {sourceHealth.limited} limited/manual
          </Badge>
        </div>
      </div>

      {sourceEntries.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {sourceEntries.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 capitalize">{key.replace("_", " ")}</p>
                <Badge variant={value?.analyzed ? "success" : "warning"}>
                  {value?.analyzed ? "Analyzed" : "Limited"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Audience override</label>
          <Textarea value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-2" rows={4} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Offer / summary override</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2" rows={4} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Business type</label>
          <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="mt-2" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Monetization model</label>
          <Input value={monetizationModel} onChange={(e) => setMonetizationModel(e.target.value)} className="mt-2" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Save business profile
        </Button>
      </div>
    </Card>
  );
}
