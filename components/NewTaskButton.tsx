"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import TaskModal from "./TaskModal";
import type { Profile } from "@/lib/types";

export default function NewTaskButton({ team, me }: { team: Profile[]; me: Profile }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        New task
      </button>
      {open && (
        <TaskModal mode="create" team={team} me={me} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
