"use client";

import { useTransition } from "react";
import { cancelarReserva } from "@/app/actions";

export function CancelarReservaBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      className="text-xs text-coral hover:text-ocean hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (confirm("Cancelar esta reserva? As mensagens pendentes serão canceladas.")) {
          start(() => {
            cancelarReserva(id);
          });
        }
      }}
    >
      {pending ? "..." : "Cancelar"}
    </button>
  );
}
