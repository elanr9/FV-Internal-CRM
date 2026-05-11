"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-brand-100 opacity-70 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-brand-200 opacity-50 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-16">
        <div className="card w-full p-8">
          <h1 className="text-2xl font-bold text-ink-900">Set your password</h1>
          <p className="mt-1 text-sm text-ink-500">
            Choose the password you want to use for FieldVision CRM.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                New password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Confirm password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
              />
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Saving..." : "Save password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
