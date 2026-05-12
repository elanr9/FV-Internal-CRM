"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const EMAIL_BY_FIRST_NAME: Record<string, string> = {
  elan: "founders@fieldvisionai.com",
  fabri: "fabri@fieldvisionai.com",
  isaac: "iad32@cornell.edu",
  gaby: "gdiaz0618@uchicago.edu",
  tona: "tonasanchezboss@gmail.com",
  sebas: "sebasdlc704@gmail.com",
  trav: "danielguerrero0803@gmail.com"
};

export default function LoginForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const email = EMAIL_BY_FIRST_NAME[firstName.trim().toLowerCase()];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !password) return;
    if (!email) {
      toast.error("Ask Elan to add your login");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email,
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

  async function onResetPassword() {
    if (!firstName) {
      toast.error("Enter your first name first");
      return;
    }
    if (!email) {
      toast.error("Ask Elan to add your login");
      return;
    }

    setResetLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    });
    setResetLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Check your email to set your password");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          First name
        </span>
        <input
          type="text"
          required
          autoFocus
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Tona"
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
          placeholder="Your password"
          className="input"
        />
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <button
        type="button"
        onClick={onResetPassword}
        disabled={resetLoading}
        className="w-full text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-60"
      >
        {resetLoading ? "Sending email..." : "Create or change password"}
      </button>
      <p className="text-center text-xs text-ink-400">
        Only invited teammates can sign in.
      </p>
    </form>
  );
}
