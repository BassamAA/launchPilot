"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { SparklesIcon } from "@heroicons/react/24/solid";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillUrl = searchParams.get("url") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback${
          prefillUrl ? `?url=${encodeURIComponent(prefillUrl)}` : ""
        }`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📬</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>.
            <br />Click it to activate your account and start marketing.
          </p>
          {prefillUrl && (
            <div className="mt-4 p-3 bg-brand-50 rounded-lg text-sm text-brand-700">
              After confirming, we'll analyze{" "}
              <span className="font-mono font-medium">{prefillUrl}</span> immediately.
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" padding="lg">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-semibold mb-4">
          <SparklesIcon className="w-3.5 h-3.5" />
          7-day free trial · No credit card
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {prefillUrl ? "Create your account" : "Start your free trial"}
        </h1>
        {prefillUrl && (
          <p className="text-sm text-gray-500">
            We'll analyze{" "}
            <span className="font-mono text-brand-600">{prefillUrl}</span> right after signup.
          </p>
        )}
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          label="Your name"
          type="text"
          placeholder="Alex Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          autoFocus
        />
        <Input
          label="Work email"
          type="email"
          placeholder="alex@yourproduct.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account — it's free
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-gray-400">
        By signing up you agree to our{" "}
        <Link href="/terms" className="hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>.
      </p>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md" padding="lg">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-brand-100 rounded-lg" />
          </div>
        </Card>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
