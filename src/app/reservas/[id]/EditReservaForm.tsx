"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { atualizarReserva } from "@/app/actions";

interface Props {
  reserva: {
    id: string;
    origem: string;
    id_externo_airbnb: string | null;
    hospede_nome: string | null;
    hospede_telefone: string | null;
    hospede_email: string | null;
    data_checkin: string;
    data_checkout: string;
    qtd_pessoas: number;
    valor: number | null;
    status_pagamento: string;
    status_reserva: string;
    observacoes: string | null;
  };
}

export function EditReservaForm({ reserva }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await atualizarReserva(fd);
      if (res.ok) {
        setOk("Reserva salva com sucesso.");
        setTimeout(() => router.push("/reservas"), 1000);
      } else {
        setErro(res.erro ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      {erro && (
        <div className="rounded-xl border border-coral/30 bg-[#FDC3D3] px-4 py-3 text-sm text-magenta">
          {erro}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-ocean/20 bg-[#DDE7F5] px-4 py-3 text-sm text-ocean">
          {ok}
        </div>
      )}

      <input type="hidden" name="id" value={reserva.id} />

      <div className="rounded-xl border border-ocean/10 bg-cream p-4 text-sm text-ocean/70">
        <p className="font-medium text-ink">Origem</p>
        <p>{reserva.origem === "airbnb" ? "Airbnb importada" : reserva.origem === "bloqueio" ? "Bloqueio manual" : "Manual"}</p>
        {reserva.id_externo_airbnb && (
          <p className="mt-2 text-xs text-[#5d533e] break-words">ID Airbnb: {reserva.id_externo_airbnb}</p>
        )}
      </div>

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink mb-1">Hóspede</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome *</label>
            <input
              name="nome"
              required
              className="input mt-1"
              defaultValue={reserva.hospede_nome ?? ""}
              placeholder="Nome do hóspede"
            />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input
              name="telefone"
              className="input mt-1"
              defaultValue={reserva.hospede_telefone ?? ""}
              placeholder="(17) 99999-9999"
            />
          </div>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            name="email"
            type="email"
            className="input mt-1"
            defaultValue={reserva.hospede_email ?? ""}
          />
        </div>
      </fieldset>

      <hr className="border-ocean/10" />

      <fieldset className="space-y-4">
        <legend className="font-display text-lg text-ink mb-1">Estadia</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Check-in *</label>
            <input
              name="data_checkin"
              type="date"
              required
              className="input mt-1"
              defaultValue={reserva.data_checkin}
            />
          </div>
          <div>
            <label className="label">Check-out *</label>
            <input
              name="data_checkout"
              type="date"
              required
              className="input mt-1"
              defaultValue={reserva.data_checkout}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Pessoas</label>
            <input
              name="qtd_pessoas"
              type="number"
              min={1}
              className="input mt-1"
              defaultValue={reserva.qtd_pessoas}
            />
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input
              name="valor"
              className="input mt-1"
              defaultValue={reserva.valor ?? ""}
            />
          </div>
          <div>
            <label className="label">Pagamento</label>
            <select name="status_pagamento" className="select mt-1" defaultValue={reserva.status_pagamento}>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Status da reserva</label>
          <select name="status_reserva" className="select mt-1" defaultValue={reserva.status_reserva}>
            <option value="confirmada">Confirmada</option>
            <option value="cancelada">Cancelada</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea
            name="observacoes"
            rows={3}
            className="textarea mt-1"
            defaultValue={reserva.observacoes ?? ""}
          />
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm">
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/reservas")}
          className="btn-ghost px-6 py-2.5 text-sm"
        >
          Voltar
        </button>
      </div>
    </form>
  );
}
