"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <p className="font-display text-2xl text-ink mb-2">Algo deu errado</p>
        <p className="text-sm text-ocean/60 mb-6">{error.message}</p>
        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
