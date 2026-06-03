"use client";

import { useTransition } from "react";
import { excluirDespesa } from "@/app/actions";

export function ExcluirDespesaBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm("Excluir esta despesa?")) return;
    start(async () => { await excluirDespesa(id); });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="btn-ghost px-2.5 py-1.5 text-xs text-magenta border-magenta/20 hover:bg-magenta/5"
    >
      {pending ? "…" : "Excluir"}
    </button>
  );
}
