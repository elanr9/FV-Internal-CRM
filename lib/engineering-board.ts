import type { Profile } from "@/lib/types";

const ENGINEERING_EDITOR_EMAILS = new Set([
  "founders@fieldvisionai.com",
  "elan@fieldvisionai.com",
  "gdiaz0618@uchicago.edu",
  "gabe@fieldvisionai.com"
]);

export function canEditEngineeringBoard(profile: Profile | null): boolean {
  if (!profile?.email) return false;
  return ENGINEERING_EDITOR_EMAILS.has(profile.email.trim().toLowerCase());
}
