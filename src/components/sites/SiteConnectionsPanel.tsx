"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input } from "@/components/ui";
import { ContentChannel, PlatformConnection, Site, SiteOnboardingState } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { getTwitterConnectionErrorMessage } from "@/lib/twitter-auth";
import { getLinkedInConnectionErrorMessage } from "@/lib/linkedin-auth";
import { BRAND_NAME } from "@/lib/brand";

interface SiteConnectionsPanelProps {
  site: Pick<Site, "id" | "name" | "slug" | "public_tracking_key">;
  connections: PlatformConnection[];
  onboarding?: SiteOnboardingState | null;
  connected?: string;
  error?: string;
  appUrl?: string;
}

const AUTO_APPROVE_OPTIONS: { channel: ContentChannel; label: string; description: string }[] = [
  {
    channel: "blog",
    label: "Blog posts",
    description: "Publish to your hosted blog automatically — no approval needed.",
  },
  {
    channel: "directory",
    label: "Directory copy",
    description: "Directory submission drafts are auto-marked ready-to-submit.",
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not connected";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SiteConnectionsPanel({
  site,
  connections,
  onboarding,
  connected,
  error,
  appUrl,
}: SiteConnectionsPanelProps) {
  const { toast } = useToast();
  const [autoApproveChannels, setAutoApproveChannels] = useState<ContentChannel[]>(
    (onboarding?.auto_approve_channels || []) as ContentChannel[]
  );
  const [savingAutoApprove, setSavingAutoApprove] = useState(false);
  const twitter = useMemo(
    () => connections.find((connection) => connection.platform === "twitter"),
    [connections]
  );
  const email = useMemo(
    () => connections.find((connection) => connection.platform === "email"),
    [connections]
  );
  const linkedin = useMemo(
    () => connections.find((connection) => connection.platform === "linkedin"),
    [connections]
  );
  const blog = useMemo(
    () => connections.find((connection) => connection.platform === "blog_external"),
    [connections]
  );

  const [blogMode, setBlogMode] = useState<string>(
    String((blog?.metadata_json?.mode as string | undefined) || "hosted")
  );
  const [blogProvider, setBlogProvider] = useState<string>(
    String((blog?.metadata_json?.provider as string | undefined) || "wordpress")
  );
  const [blogApiUrl, setBlogApiUrl] = useState<string>(
    String((blog?.metadata_json?.api_url as string | undefined) || "")
  );
  const [blogApiKey, setBlogApiKey] = useState<string>("");
  const [emailMode, setEmailMode] = useState<string>(
    String((email?.metadata_json?.mode as string | undefined) || "default")
  );
  const [emailDomain, setEmailDomain] = useState<string>(
    String((email?.metadata_json?.domain as string | undefined) || "")
  );
  const [fromName, setFromName] = useState<string>(
    String((email?.metadata_json?.from_name as string | undefined) || site.name || BRAND_NAME)
  );
  const [fromEmail, setFromEmail] = useState<string>(
    String((email?.metadata_json?.from_email as string | undefined) || "")
  );
  const [savingBlog, setSavingBlog] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [disconnecting, setDisconnecting] = useState<null | "twitter" | "linkedin" | "email" | "blog_external">(null);
  const appOrigin = (appUrl || "").replace(/\/$/, "") || "http://localhost:3000";
  const pixelUrl = site.public_tracking_key
    ? `${appOrigin}/pixel/${site.public_tracking_key}.js`
    : null;
  const conversionSnippet = pixelUrl
    ? `<script async src="${pixelUrl}"></script>\n<script>\n  window.launchpilot?.trackConversion({ event: "signup" });\n</script>`
    : null;
  const activationSnippet = pixelUrl
    ? `<script async src="${pixelUrl}"></script>\n<script>\n  window.launchpilot?.trackEvent({ event: "activated" });\n  window.launchpilot?.trackEvent({ event: "subscribed", value: 99, currency: "USD" });\n</script>`
    : null;
  const twitterErrorMessage = getTwitterConnectionErrorMessage(error);
  const linkedinErrorMessage = getLinkedInConnectionErrorMessage(error);
  const connectionErrorMessage = twitterErrorMessage || linkedinErrorMessage;

  async function saveConnection(platform: string, metadataJson: Record<string, unknown>) {
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_id: site.id,
        platform,
        metadata_json: metadataJson,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to save connection");
    }
  }

  async function handleSaveBlog() {
    setSavingBlog(true);
    try {
      await saveConnection("blog_external", {
        mode: blogMode,
        provider: blogProvider,
        api_url: blogApiUrl || null,
        api_key: blogApiKey || null,
        status: blogMode === "external" ? "coming_soon" : "hosted",
      });
      toast("Blog settings saved.", "success");
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : "Failed to save blog settings.", "error");
    } finally {
      setSavingBlog(false);
    }
  }

  async function handleSaveEmail() {
    setSavingEmail(true);
    try {
      await saveConnection("email", {
        mode: emailMode,
        domain: emailDomain || null,
        from_name: fromName,
        from_email: fromEmail || null,
        domain_verified: false,
      });
      toast("Email sender settings saved.", "success");
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : "Failed to save email settings.", "error");
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSaveAutoApprove() {
    setSavingAutoApprove(true);
    try {
      const next: SiteOnboardingState = {
        ...(onboarding || {}),
        auto_approve_channels: autoApproveChannels,
      };
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_json: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("Auto-approve settings saved.", "success");
    } catch {
      toast("Failed to save auto-approve settings.", "error");
    } finally {
      setSavingAutoApprove(false);
    }
  }

  function toggleAutoApprove(channel: ContentChannel) {
    setAutoApproveChannels((current) =>
      current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel]
    );
  }

  async function handleDisconnect(platform: "twitter" | "linkedin" | "email" | "blog_external") {
    setDisconnecting(platform);
    try {
      const res = await fetch("/api/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id, platform }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to disconnect");
      }
      toast("Connection removed.", "success");
      window.location.reload();
    } catch (disconnectError) {
      toast(
        disconnectError instanceof Error ? disconnectError.message : "Failed to disconnect.",
        "error"
      );
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="space-y-6">
      {(connected || error) && (
        <Card
          padding="md"
          className={connected ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}
        >
          <p className={`text-sm font-medium ${connected ? "text-emerald-800" : "text-red-800"}`}>
            {connected ? `${connected} connected successfully.` : connectionErrorMessage}
          </p>
        </Card>
      )}

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Twitter / X</h2>
              {twitter ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Not connected</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Connect a Twitter account so approved tweets can publish automatically.
            </p>
          </div>
          {twitter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnect("twitter")}
              loading={disconnecting === "twitter"}
            >
              Disconnect
            </Button>
          ) : (
            <Button size="sm" type="button" onClick={() => (window.location.href = `/api/auth/twitter?site_id=${site.id}`)}>
              Connect Twitter
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Handle</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{twitter?.platform_username || "Not connected"}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Connected</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(twitter?.connected_at)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Expires</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(twitter?.expires_at)}</p>
          </div>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">LinkedIn</h2>
              {linkedin ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Not connected</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Connect LinkedIn so approved posts can publish automatically to your profile.
            </p>
          </div>
          {linkedin ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnect("linkedin")}
              loading={disconnecting === "linkedin"}
            >
              Disconnect
            </Button>
          ) : (
            <Button size="sm" type="button" onClick={() => (window.location.href = `/api/auth/linkedin?siteId=${site.id}`)}>
              Connect LinkedIn
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Profile</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{linkedin?.platform_username || "Not connected"}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Connected</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(linkedin?.connected_at)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Expires</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(linkedin?.expires_at)}</p>
          </div>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Tracking Snippets</h2>
              <Badge variant={pixelUrl ? "success" : "warning"}>
                {pixelUrl ? "Ready" : "Unavailable"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Use the conversion pixel for signups and the product event helper for activation and revenue events.
            </p>
          </div>
        </div>

        {conversionSnippet && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Signup tracking</p>
            <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 p-4 text-xs text-gray-100">
              {conversionSnippet}
            </pre>
          </div>
        )}

        {activationSnippet && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Activation / revenue tracking</p>
            <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 p-4 text-xs text-gray-100">
              {activationSnippet}
            </pre>
          </div>
        )}
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Blog</h2>
              <Badge variant={blogMode === "hosted" ? "success" : "info"}>
                {blogMode === "hosted" ? `Hosted by ${BRAND_NAME}` : "External blog"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Hosted blog publishing works now. External blog connections are saved, but the publish API is still marked coming soon.
            </p>
          </div>
          {blog && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnect("blog_external")}
              loading={disconnecting === "blog_external"}
            >
              Reset
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-gray-200 p-4">
            <input
              type="radio"
              name="blog-mode"
              className="mr-2"
              checked={blogMode === "hosted"}
              onChange={() => setBlogMode("hosted")}
            />
            <span className="font-semibold text-gray-900">{BRAND_NAME} hosted blog</span>
            <p className="mt-1 text-sm text-gray-500">
              Posts go live at `/blog/{site.slug || "your-site"}` with zero setup.
            </p>
          </label>

          <label className="rounded-xl border border-gray-200 p-4">
            <input
              type="radio"
              name="blog-mode"
              className="mr-2"
              checked={blogMode === "external"}
              onChange={() => setBlogMode("external")}
            />
            <span className="font-semibold text-gray-900">External blog API</span>
            <p className="mt-1 text-sm text-gray-500">
              Save your WordPress, Ghost, or custom API details now. Publish integration is coming soon.
            </p>
          </label>
        </div>

        {blogMode === "external" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Platform"
              value={blogProvider}
              onChange={(event) => setBlogProvider(event.target.value)}
              placeholder="wordpress | ghost | custom"
            />
            <Input
              label="API URL"
              value={blogApiUrl}
              onChange={(event) => setBlogApiUrl(event.target.value)}
              placeholder="https://yourblog.com/wp-json/..."
            />
            <Input
              label="API key"
              value={blogApiKey}
              onChange={(event) => setBlogApiKey(event.target.value)}
              placeholder="Stored for later when publish goes live"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Hosted mode publishes immediately. External mode stores config only.
          </p>
          <Button onClick={handleSaveBlog} loading={savingBlog}>
            Save blog settings
          </Button>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Auto-Approval</h2>
          <p className="text-sm text-gray-500 mt-1">
            When enabled, {BRAND_NAME} publishes these content types automatically after generation — no manual review required.
          </p>
        </div>
        <div className="space-y-3">
          {AUTO_APPROVE_OPTIONS.map((option) => (
            <label
              key={option.channel}
              className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={autoApproveChannels.includes(option.channel)}
                onChange={() => toggleAutoApprove(option.channel)}
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Twitter, LinkedIn, Reddit, and email always require manual approval.
          </p>
          <Button onClick={handleSaveAutoApprove} loading={savingAutoApprove}>
            Save
          </Button>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Email via Resend</h2>
              {email ? <Badge variant="success">Configured</Badge> : <Badge variant="warning">Not configured</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Approved email items move into a campaign review flow. Use a {BRAND_NAME} sender for testing or save your own domain details.
            </p>
          </div>
          {email && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnect("email")}
              loading={disconnecting === "email"}
            >
              Disconnect
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-gray-200 p-4">
            <input
              type="radio"
              name="email-mode"
              className="mr-2"
              checked={emailMode === "default"}
              onChange={() => setEmailMode("default")}
            />
            <span className="font-semibold text-gray-900">{BRAND_NAME} sender</span>
            <p className="mt-1 text-sm text-gray-500">
              Fastest path for testing. Good for trial campaigns and QA.
            </p>
          </label>

          <label className="rounded-xl border border-gray-200 p-4">
            <input
              type="radio"
              name="email-mode"
              className="mr-2"
              checked={emailMode === "custom"}
              onChange={() => setEmailMode("custom")}
            />
            <span className="font-semibold text-gray-900">Custom sending domain</span>
            <p className="mt-1 text-sm text-gray-500">
              Add your domain in Resend, publish the DNS records they give you, then save the verified sender below.
            </p>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Sending domain"
            value={emailDomain}
            onChange={(event) => setEmailDomain(event.target.value)}
            placeholder="mail.yourdomain.com"
            helper="Resend will require SPF and DKIM DNS records before this is verified."
          />
          <Input
            label="From name"
            value={fromName}
            onChange={(event) => setFromName(event.target.value)}
            placeholder={`Bassam from ${BRAND_NAME}`}
          />
          <Input
            label="From email"
            value={fromEmail}
            onChange={(event) => setFromEmail(event.target.value)}
            placeholder="founder@mail.yourdomain.com"
          />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Add the domain in Resend first, publish the DNS records they provide, wait for verification, then save the verified sender here. Until then you can use the default {BRAND_NAME} testing address.
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Email campaigns are reviewed manually before sending.
          </p>
          <Button onClick={handleSaveEmail} loading={savingEmail}>
            Save email setup
          </Button>
        </div>
      </Card>

      <Card padding="md" className="space-y-2">
        <h2 className="text-lg font-bold text-gray-900">Hosted Blog URLs</h2>
        <p className="text-sm text-gray-500">
          When hosted publishing is enabled, published blog posts appear here.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/blog/${site.slug || site.id}`} className="text-brand-600 hover:underline">
            View blog
          </Link>
          <Link href={`/blog/${site.slug || site.id}/feed.xml`} className="text-brand-600 hover:underline">
            RSS feed
          </Link>
          <Link href={`/blog/${site.slug || site.id}/sitemap.xml`} className="text-brand-600 hover:underline">
            Blog sitemap
          </Link>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Conversion Tracking</h2>
              {site.public_tracking_key ? <Badge variant="info">Ready to install</Badge> : <Badge variant="warning">Missing key</Badge>}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Install one first-party pixel on your product site so {BRAND_NAME} can connect clicks to signups.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Pixel script</p>
            <p className="mt-2 break-all text-sm text-gray-900">{pixelUrl || "Tracking key unavailable"}</p>
            <p className="mt-2 text-xs text-gray-500">
              Add this script to the pages where you want {BRAND_NAME} attribution available.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Simple conversion call</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-gray-800">
              {`window.launchpilot?.trackConversion({ event: "signup" });`}
            </pre>
            <p className="mt-2 text-xs text-gray-500">
              Fire this on the signup success page or after your onboarding completion event.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          {BRAND_NAME} stores the last tracked link in local storage, then attributes the conversion back to the originating content item and channel. Use the explicit call above or add a page marker like <code>data-launchpilot-conversion="signup"</code>.
        </div>

        {conversionSnippet && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Install snippet</p>
            <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 p-4 text-xs text-gray-100">
              {conversionSnippet}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
