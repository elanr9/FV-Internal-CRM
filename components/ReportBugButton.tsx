"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import ReportBugModal from "./ReportBugModal";

export default function ReportBugButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        <Bug className="h-4 w-4" />
        Report a bug
      </button>
      {open && <ReportBugModal onClose={() => setOpen(false)} />}
    </>
  );
}
