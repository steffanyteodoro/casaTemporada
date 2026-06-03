"use client";

import { useState } from "react";

export function TestarTelegramBtn() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "erro">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function testar() {
    setEstado("enviando");
    setMsg(null);
    try {
      const res = await fetch("/api/telegram-test", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setEstado("ok");
        setMsg("Mensagem de teste enviada! Confira seu Telegram.");
      } else {
        setEstado("erro");
        setMsg(data.erro ?? "Falha ao enviar.");
      }
    } catch {
      setEstado("erro");
      setMsg("Erro de conexão.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={testar} disabled={estado === "enviando"} className="btn-ghost px-4 py-2 text-sm">
        {estado === "enviando" ? "Enviando..." : "📨 Testar Telegram"}
      </button>
      {msg && (
        <span className={`text-xs ${estado === "ok" ? "text-emerald-700" : "text-magenta"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
