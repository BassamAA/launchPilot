"use client";

import { ReactNode, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { GrowthSurface } from "@/types";
import {
  BoltIcon,
  CalendarIcon,
  ChartBarIcon,
  CursorArrowRaysIcon,
  MegaphoneIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const SURFACE_ICONS: Record<string, ReactNode> = {
  founder_social: <MegaphoneIcon className="w-5 h-5" />,
  seo_content: <SparklesIcon className="w-5 h-5" />,
  short_form_video: <BoltIcon className="w-5 h-5" />,
  cold_outbound: <CursorArrowRaysIcon className="w-5 h-5" />,
  community_engagement: <UserGroupIcon className="w-5 h-5" />,
  directory_presence: <ChartBarIcon className="w-5 h-5" />,
  influencer_partnership: <UserGroupIcon className="w-5 h-5" />,
  referral_program: <SparklesIcon className="w-5 h-5" />,
  lifecycle_email: <CalendarIcon className="w-5 h-5" />,
  paid_acquisition: <ChartBarIcon className="w-5 h-5" />,
  landing_page_optimization: <CursorArrowRaysIcon className="w-5 h-5" />,
};

export default function GrowthSurfacesPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { toast } = useToast();

  const [surfaces, setSurfaces] = useState<GrowthSurface[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await fetch(`/api/sites/${siteId}/surfaces`);
        if (!res.ok) {
          if (active) setLoadError(true);
          return;
        }
        const payload = await res.json();
        if (active) {
          setSurfaces(payload.surfaces || []);
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [siteId]);

  async function updateSurface(surfaceId: string, status: GrowthSurface["status"]) {
    setSavingId(surfaceId);
    try {
      const res = await fetch(`/api/sites/${siteId}/surfaces`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surfaceId, status }),
      });

      if (!res.ok) {
        toast("Failed to update surface. Please try again.", "error");
        return;
      }
      const payload = await res.json();
      setSurfaces(payload.surfaces || []);
    } catch {
      toast("Failed to update surface. Please try again.", "error");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        title="Couldn't load growth surfaces"
        description="Something went wrong fetching your growth surfaces. Please refresh the page."
        action={
          <Button onClick={() => window.location.reload()}>Try again</Button>
        }
      />
    );
  }

  if (surfaces.length === 0) {
    return (
      <EmptyState
        title="No growth surfaces yet"
        description="Confirm the marketing brief first so LaunchPilot can recommend the right growth surfaces for this business."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Growth Surfaces</h1>
        <p className="mt-1 text-sm text-gray-500">
          LaunchPilot recommends the growth motions that fit this business. Active surfaces shape the plan and content mix.
        </p>
      </div>

      <div className="grid gap-4">
        {surfaces.map((surface) => (
          <Card key={surface.id} padding="md">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-brand-50 text-brand-700 p-2">
                  {SURFACE_ICONS[surface.surface_type] || <SparklesIcon className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900">{surface.display_name}</h2>
                    <Badge variant={surface.status === "active" ? "success" : surface.status === "paused" ? "warning" : "info"}>
                      {surface.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="default">Priority #{surface.priority}</Badge>
                    <Badge variant={surface.execution_ready ? "success" : "warning"}>
                      {surface.execution_ready ? "Execution ready" : "Strategic guidance only"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 max-w-3xl">
                    {surface.rationale || "LaunchPilot recommended this growth surface based on your business profile."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {surface.channels.length > 0 ? (
                      surface.channels.map((channel) => (
                        <Badge key={channel} variant="purple">
                          {channel}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="default">No direct execution channel yet</Badge>
                    )}
                  </div>
                  {!surface.execution_ready && (
                    <p className="mt-3 text-xs text-gray-500">
                      Coming soon. LaunchPilot will use this surface as strategy guidance first, then add direct execution later.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {surface.status !== "active" && (
                  <Button
                    size="sm"
                    onClick={() => updateSurface(surface.id, "active")}
                    loading={savingId === surface.id}
                  >
                    Activate
                  </Button>
                )}
                {surface.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateSurface(surface.id, "paused")}
                    loading={savingId === surface.id}
                  >
                    Pause
                  </Button>
                )}
                {surface.status !== "recommended" && surface.status !== "active" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateSurface(surface.id, "recommended")}
                    loading={savingId === surface.id}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
