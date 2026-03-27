"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Card } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError("Failed to send reset email. Please try again.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm mb-6">
            We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link.
          </p>
          <Link href="/login" className="text-brand-600 text-sm font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" padding="lg">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
        <p className="text-gray-500 text-sm">Enter your email and we'll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
