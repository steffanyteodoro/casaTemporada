"use client";

import { useState, useTransition, type FormEvent } from "react";
import { salvarDespesa } from "@/app/actions";

interface Props {
  categorias: { value: string; label: string }[];
}

export function DespesaForm({ categorias }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    start(async () => {
      const res = await salvarDespesa(fd);
      if (res.ok) {
        form.reset();
        setOpen(false);
      } else {
        setErro(res.erro ?? "Erro ao salvar.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary px-5 py-2.5 text-sm w-full"
      >
        + Lançar despesa
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">Nova despesa</p>
        <button type="button" onClick={() => setOpen(false)} className="text-ocean/50 hover:text-ocean text-xl leading-none">×</button>
      </div>

      {erro && (
        <div className="rounded-xl bg-[#FDC3D3] border border-coral/30 px-4 py-3 text-sm text-magenta">{erro}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Data *</label>
          <input name="data" type="date" required className="input mt-1" />
        </div>
        <div>
          <label className="label">Valor (R$) *</label>
          <input name="valor" required className="input mt-1" placeholder="0,00" />
        </div>
      </div>

      <div>
        <label className="label">Descrição *</label>
        <input name="descricao" required className="input mt-1" placeholder="Ex: Faxina pós-estadia" />
      </div>

      <div>
        <label className="label">Categoria</label>
        <select name="categoria" className="select mt-1">
          {categorias.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea name="observacoes" rows={2} className="textarea mt-1" placeholder="Opcional" />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2 text-sm">
          {pending ? "Salvando..." : "Salvar despesa"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-5 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
