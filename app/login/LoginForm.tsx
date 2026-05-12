"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const accountRes = await fetch("/api/auth/team-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const account = await accountRes.json().catch(() => ({}));
    if (!accountRes.ok || !account.email) {
      setLoading(false);
      toast.error(account.error ?? "Could not create account");
      return;
    }

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
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
          Username
        </span>
        <input
          type="text"
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tona"
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Password
        </span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 transition hover:text-ink-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in..." : "Create account or sign in"}
      </button>
      <p className="text-center text-xs text-ink-400">
        Use tona, fabri, isaac, sebas, lucho, gaby, trav, or elan.
      </p>
    </form>
  );
}
