"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner, Textarea } from "@/components/ui";

type OperatorMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  body: string;
  created_at: string;
  metadata_json?: {
    kind?: string;
    content_item_id?: string;
    handoff?: {
      actionLabel?: string;
      url?: string | null;
      fallbackHint?: string;
      shouldCopyBeforeOpen?: boolean;
    };
  };
};

export function OperatorChat({ siteId }: { siteId: string }) {
  const [messages, setMessages] = useState<OperatorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sites/${siteId}/operator-thread`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load chat");
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(value?: string) {
    const next = (value ?? input).trim();
    if (!next || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/sites/${siteId}/operator-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setMessages(data.messages || []);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Operator chat</p>
        <p className="mt-1 text-sm text-gray-500">
          Ask what to post next, what the system knows, or what to do this week.
        </p>
      </div>

      <div ref={listRef} className="rounded-2xl border border-gray-100 bg-white p-4 h-[420px] overflow-y-auto space-y-3">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No messages yet.
          </div>
        ) : (
          messages.map((message) => {
            const handoff = message.metadata_json?.handoff;
            return (
              <div key={message.id} className="space-y-2">
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-brand-500 text-white"
                      : "bg-gray-50 text-gray-800"
                  }`}
                >
                  {message.body}
                </div>

                {message.role === "assistant" && message.metadata_json?.kind === "draft_suggestion" && (
                  <div className="max-w-[85%] rounded-xl border border-gray-100 bg-white px-4 py-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => send("draft next post")}>Another draft</Button>
                      <Button size="sm" variant="outline" onClick={() => send("what should we do this week")}>This week</Button>
                      {handoff?.url && (
                        <a
                          href={handoff.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (handoff.shouldCopyBeforeOpen) {
                              navigator.clipboard.writeText(message.body).catch(() => {});
                            }
                          }}
                          className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
                        >
                          {handoff.actionLabel || "Open"}
                        </a>
                      )}
                    </div>
                    {handoff?.fallbackHint && (
                      <p className="text-xs text-gray-500">{handoff.fallbackHint}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setInput("what do you know about my business?")} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">What do you know?</button>
          <button onClick={() => setInput("what should we do this week?")} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">This week</button>
          <button onClick={() => setInput("draft next post")} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">Draft next post</button>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="Ask what to post next, what the business should do this week, or what the system knows about your business..."
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={() => send()} loading={sending}>Send</Button>
        </div>
      </div>
    </div>
  );
}
