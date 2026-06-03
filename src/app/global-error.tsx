"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#EBEBD3", color: "#083D77", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", border: "1px solid rgba(8,61,119,0.1)", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", textAlign: "center" }}>
            <h1 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 600 }}>Algo deu errado</h1>
            <p style={{ fontSize: 14, color: "rgba(8,61,119,0.6)", margin: "0 0 24px", wordBreak: "break-word" }}>
              {error?.message || "Erro inesperado na aplicação."}
            </p>
            <button
              onClick={reset}
              style={{ background: "#083D77", color: "#EBEBD3", border: "none", borderRadius: 999, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
