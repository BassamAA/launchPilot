"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Card } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { RocketLaunchIcon } from "@heroicons/react/24/solid";
import { BRAND_NAME } from "@/lib/brand";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Supabase delivers the session via URL fragment (#access_token=...) on this page
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is authenticated with recovery token — ready to set new password
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Failed to update password. Please try again.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <RocketLaunchIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{BRAND_NAME}</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" padding="lg">
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-gray-500 text-sm">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
                <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="New password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Update password
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
