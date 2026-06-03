"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncAirbnbBtn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMsg(null);
    try {
      const headers = process.env.NEXT_PUBLIC_CRON_SECRET
        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
        : undefined;
      const resp = await fetch("/api/sync-airbnb", { method: "POST", headers });
      const data = await resp.json();
      if (data.ok) {
        setMsg(
          `Importadas ${data.importadas} · atualizadas ${data.atualizadas}` +
            (data.conflitos ? ` · ${data.conflitos} conflito(s)` : "")
        );
        router.refresh();
      } else {
        setMsg("Erro: " + (data.erro ?? "desconhecido"));
      }
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button onClick={sync} disabled={loading} className="btn-primary px-4 py-2 text-sm">
        {loading ? "Sincronizando..." : "⟳ Sincronizar Airbnb"}
      </button>
      {msg && (
        <span className="absolute left-0 top-full mt-1 text-xs text-ocean/70 whitespace-nowrap">
          {msg}
        </span>
      )}
    </div>
  );
}
