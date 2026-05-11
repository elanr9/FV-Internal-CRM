"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Email
        </span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@fieldvisionai.com"
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Password
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your team password"
          className="input"
        />
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-xs text-ink-400">
        Only invited teammates can sign in.
      </p>
    </form>
  );
}
