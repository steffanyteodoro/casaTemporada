"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarReservaManual } from "@/app/actions";

export default function NovaReserva() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await criarReservaManual(fd);
      if (res.ok) {
        setOk(
          `Reserva criada! ${res.mensagens ?? 0} mensagem(ns) agendada(s).` +
            (res.aviso ? ` (${res.aviso})` : "")
        );
        setTimeout(() => router.push("/reservas"), 1200);
      } else {
        setErro(res.erro ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <p className="label">Operação</p>
        <h2 className="font-display text-3xl text-ink">Nova reserva manual</h2>
        <p className="text-sm text-ocean/60 mt-1">
          Reservas feitas diretamente com você (fora do Airbnb).
        </p>
      </header>

      {erro && (
        <div className="mb-5 rounded-xl border border-coral/30 bg-[#FDC3D3] px-4 py-3 text-sm text-magenta">
          {erro}
        </div>
      )}
      {ok && (
        <div className="mb-5 rounded-xl border border-ocean/20 bg-[#DDE7F5] px-4 py-3 text-sm text-ocean">
          {ok}
        </div>
      )}

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <fieldset className="space-y-4">
          <legend className="font-display text-lg text-ink mb-1">Hóspede</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input name="nome" required className="input mt-1" placeholder="Maria Silva" />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input
                name="telefone"
                className="input mt-1"
                placeholder="(17) 99999-9999"
              />
            </div>
          </div>
          <div>
            <label className="label">E-mail (opcional)</label>
            <input name="email" type="email" className="input mt-1" />
          </div>
        </fieldset>

        <hr className="border-ocean/10" />

        <fieldset className="space-y-4">
          <legend className="font-display text-lg text-ink mb-1">Estadia</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Check-in *</label>
              <input name="data_checkin" type="date" required className="input mt-1" />
            </div>
            <div>
              <label className="label">Check-out *</label>
              <input name="data_checkout" type="date" required className="input mt-1" />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Pessoas</label>
              <input
                name="qtd_pessoas"
                type="number"
                min={1}
                defaultValue={2}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input name="valor" className="input mt-1" placeholder="1200,00" />
            </div>
            <div>
              <label className="label">Pagamento</label>
              <select name="status_pagamento" className="select mt-1" defaultValue="pendente">
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea name="observacoes" rows={3} className="textarea mt-1" />
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm">
            {pending ? "Salvando..." : "Salvar reserva"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/reservas")}
            className="btn-ghost px-6 py-2.5 text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
