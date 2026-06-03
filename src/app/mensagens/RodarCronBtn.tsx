"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RodarCronBtn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function rodar() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/cron", { method: "POST" });
      const data = await resp.json();
      if (data.ok) {
        setMsg(
          `Processadas ${data.processadas} · enviadas ${data.enviadas} · falhas ${data.falhas}`
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
    <div className="text-right">
      <button onClick={rodar} disabled={loading} className="btn-primary px-5 py-2.5 text-sm">
        {loading ? "Processando..." : "▶ Disparar mensagens agora"}
      </button>
      {msg && <p className="text-xs text-ocean/70 mt-1">{msg}</p>}
    </div>
  );
}
