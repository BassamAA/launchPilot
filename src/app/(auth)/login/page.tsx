"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(redirect);
  }

  return (
    <Card className="w-full max-w-md" padding="lg">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-500 text-sm">Sign in to your LaunchPilot dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center text-sm text-gray-500">
        <p>
          <Link href="/forgot-password" className="text-brand-600 font-medium hover:underline">
            Forgot your password?
          </Link>
        </p>
        <p>
          Don't have an account?{" "}
          <Link href="/signup" className="text-brand-600 font-medium hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
