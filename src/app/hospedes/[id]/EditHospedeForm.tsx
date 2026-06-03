"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { salvarHospede } from "@/app/actions";

interface Props {
  hospede: {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    observacoes: string | null;
    preferencias: string | null;
  };
}

export function EditHospedeForm({ hospede }: Props) {
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
      const res = await salvarHospede(fd);
      if (res.ok) {
        setOk("Dados salvos com sucesso.");
        router.refresh();
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

      <input type="hidden" name="id" value={hospede.id} />

      <div>
        <label className="label">Nome *</label>
        <input
          name="nome"
          required
          className="input mt-1"
          defaultValue={hospede.nome}
          placeholder="Nome completo"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">WhatsApp</label>
          <input
            name="telefone"
            className="input mt-1"
            defaultValue={hospede.telefone ?? ""}
            placeholder="(17) 99999-9999"
          />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            name="email"
            type="email"
            className="input mt-1"
            defaultValue={hospede.email ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label">Preferências</label>
        <textarea
          name="preferencias"
          rows={2}
          className="textarea mt-1"
          defaultValue={hospede.preferencias ?? ""}
          placeholder="Ex: prefere quarto frio, alérgico a amendoim…"
        />
      </div>

      <div>
        <label className="label">Observações internas</label>
        <textarea
          name="observacoes"
          rows={2}
          className="textarea mt-1"
          defaultValue={hospede.observacoes ?? ""}
          placeholder="Notas internas sobre o hóspede"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm">
        {pending ? "Salvando..." : "Salvar dados"}
      </button>
    </form>
  );
}
