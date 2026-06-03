import type { StatusPagamento, StatusReserva, StatusEnvio, OrigemReserva } from "@/lib/types";

const cores: Record<string, { bg: string; fg: string; label: string }> = {
  // pagamento
  pendente: { bg: "#FFF1BF", fg: "#083D77", label: "Pendente" },
  parcial: { bg: "#FDE8A4", fg: "#083D77", label: "Parcial" },
  pago: { bg: "#DDE7F5", fg: "#083D77", label: "Pago" },
  // reserva
  confirmada: { bg: "#DDE7F5", fg: "#083D77", label: "Confirmada" },
  cancelada: { bg: "#F5D2DC", fg: "#DA4167", label: "Cancelada" },
  concluida: { bg: "#DDE7F5", fg: "#083D77", label: "Concluída" },
  // envio
  agendada: { bg: "#DDE7F5", fg: "#083D77", label: "Agendada" },
  enviada: { bg: "#DDE7F5", fg: "#083D77", label: "Enviada" },
  falhou: { bg: "#F7C7D3", fg: "#DA4167", label: "Falhou" },
  lida: { bg: "#DDE7F5", fg: "#083D77", label: "Lida" },
  // origem
  airbnb: { bg: "#FDE8A4", fg: "#083D77", label: "Airbnb" },
  manual: { bg: "#DDE7F5", fg: "#083D77", label: "Manual" },
  bloqueio: { bg: "#FFF1BF", fg: "#083D77", label: "Bloqueio" },
  faxina: { bg: "#E8E0F5", fg: "#4C2D8A", label: "🧹 Faxina" },
};

export function Badge({
  status,
}: {
  status: StatusPagamento | StatusReserva | StatusEnvio | OrigemReserva | string;
}) {
  const c = cores[status] ?? { bg: "#EBEBD3", fg: "#083D77", label: status };
  return (
    <span className="badge" style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}
