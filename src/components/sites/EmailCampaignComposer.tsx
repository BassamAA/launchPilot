"use client";

import { useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import { ContentItem } from "@/types";
import { useToast } from "@/components/ui/Toast";

interface Recipient {
  email: string;
  name?: string;
  company?: string;
}

interface EmailCampaignComposerProps {
  item: ContentItem;
  siteId: string;
  emailSettings: Record<string, unknown>;
}

function parseRecipientsFromText(value: string): Recipient[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, name, company] = line.split(",").map((part) => part?.trim());
      return { email, name, company };
    })
    .filter((recipient) => recipient.email);
}

function personalize(value: string, recipient: Recipient) {
  return value
    .replace(/\{\{first_name\}\}/gi, recipient.name?.split(" ")[0] || "there")
    .replace(/\{\{name\}\}/gi, recipient.name || "there")
    .replace(/\{\{company\}\}/gi, recipient.company || "your company")
    .replace(/\{\{email\}\}/gi, recipient.email);
}

function parseCsv(text: string): Recipient[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    return {
      email: record.email || "",
      name: record.first_name || record.name || "",
      company: record.company || "",
    };
  }).filter((recipient) => recipient.email);
}

export function EmailCampaignComposer({
  item,
  siteId,
  emailSettings,
}: EmailCampaignComposerProps) {
  const { toast } = useToast();
  const [campaignName, setCampaignName] = useState(item.title);
  const [recipientText, setRecipientText] = useState("");
  const [sending, setSending] = useState<"test" | "live" | null>(null);
  const [uploading, setUploading] = useState(false);

  const recipients = useMemo(() => parseRecipientsFromText(recipientText), [recipientText]);
  const subject = String((item.metadata_json as Record<string, string>)?.subject_line || item.title);
  const previewRecipient = recipients[0] || { email: "jane@example.com", name: "Jane Founder", company: "Acme" };
  const previewBody = personalize(item.body, previewRecipient);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast("CSV did not contain any usable recipients.", "error");
        return;
      }

      const nextText = parsed
        .map((recipient) => [recipient.email, recipient.name || "", recipient.company || ""].join(","))
        .join("\n");

      setRecipientText((current) => [current.trim(), nextText].filter(Boolean).join("\n"));
      toast(`Imported ${parsed.length} recipients.`, "success");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function sendCampaign(testOnly: boolean) {
    if (recipients.length === 0) {
      toast("Add at least one recipient first.", "error");
      return;
    }

    setSending(testOnly ? "test" : "live");
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_item_id: item.id,
          recipients,
          campaign_name: campaignName,
          test_only: testOnly,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(payload.error || "Failed to send email campaign.", "error");
        return;
      }

      toast(
        testOnly
          ? "Test email sent."
          : `Campaign sent to ${payload.sent || 0} recipient${payload.sent === 1 ? "" : "s"}.`,
        "success"
      );
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recipients</h2>
              <p className="text-sm text-gray-500 mt-1">
                Paste `email,name,company` rows or upload a CSV with `email`, `first_name`, and `company` columns.
              </p>
            </div>
            <Badge variant="info">{recipients.length} loaded</Badge>
          </div>

          <Input
            label="Campaign name"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
          />

          <Textarea
            label="Recipients"
            value={recipientText}
            onChange={(event) => setRecipientText(event.target.value)}
            placeholder={"jane@example.com,Jane Founder,Acme\nalex@example.com,Alex,Northstar"}
            className="min-h-[220px]"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
              <input type="file" accept=".csv,text/csv" onChange={handleUpload} disabled={uploading} />
              {uploading ? "Importing..." : "Upload CSV"}
            </label>
            <Button variant="outline" onClick={() => sendCampaign(true)} loading={sending === "test"}>
              Send test email
            </Button>
            <Button onClick={() => sendCampaign(false)} loading={sending === "live"}>
              Send campaign
            </Button>
          </div>
        </Card>

        <Card padding="md" className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Sender</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Mode</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {String(emailSettings.mode || "default")}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">From</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {String(emailSettings.from_name || BRAND_NAME)}
                {emailSettings.from_email ? ` <${String(emailSettings.from_email)}>` : ""}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card padding="md" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Preview</h2>
            <p className="text-sm text-gray-500 mt-1">
              Personalization preview using the first recipient in your list.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Subject</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{personalize(subject, previewRecipient)}</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 whitespace-pre-wrap text-sm text-gray-700">
            {previewBody}
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Checklist</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Review the first few personalized previews.</li>
            <li>Send a test email to yourself before sending the full campaign.</li>
            <li>Keep cold outreach volume modest. This flow is rate limited to 2 emails per second.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
