"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { atualizarModeloMensagem } from "@/app/actions";

interface Props {
  modelo: {
    id: string;
    nome: string;
    canal: string;
    gatilho: string;
    referencia: string;
    offset_dias: number;
    hora_envio: string;
    texto_template: string;
    eh_template: boolean;
    nome_template: string | null;
    ativo: boolean;
  };
}

const sampleData = {
  nome: "Maria",
  nome_completo: "Maria Silva",
  checkin: "10/07/2026",
  checkout: "14/07/2026",
  pessoas: "2",
  valor: "R$ 1.500,00",
  noites: "4",
  casa: "Casa de Temporada Olímpia",
};

function renderPreview(texto: string) {
  return texto.replace(/\{(\w+)\}/g, (_, key) => sampleData[key as keyof typeof sampleData] ?? `{${key}}`);
}

export function EditModeloForm({ modelo }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState(renderPreview(modelo.texto_template));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await atualizarModeloMensagem(fd);
      if (res.ok) {
        setOk("Modelo salvo com sucesso.");
        setTimeout(() => router.push("/mensagens"), 1000);
      } else {
        setErro(res.erro ?? "Erro ao salvar.");
      }
    });
  }

  function updatePreview(texto: string) {
    setPreview(renderPreview(texto));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {erro && (
        <div className="rounded-xl border border-[#f0c2c2] bg-[#fbeaea] px-4 py-3 text-sm text-[#a32c2c]">
          {erro}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-[#bfe0d2] bg-[#e8f4ee] px-4 py-3 text-sm text-[#1f6e6e]">
          {ok}
        </div>
      )}

      <input type="hidden" name="id" value={modelo.id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Nome do modelo</label>
            <input name="nome" required defaultValue={modelo.nome} className="input mt-1 w-full" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Canal</label>
              <select name="canal" defaultValue={modelo.canal} className="select mt-1 w-full">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="label">Gatilho</label>
              <select name="gatilho" defaultValue={modelo.gatilho} className="select mt-1 w-full">
                <option value="confirmacao">Confirmação</option>
                <option value="antes_checkin">Antes do check-in</option>
                <option value="dia_checkin">Dia do check-in</option>
                <option value="durante">Durante a estadia</option>
                <option value="antes_checkout">Antes do check-out</option>
                <option value="pos_checkout">Pós-estadia</option>
                <option value="reconvite">Reconvite</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Referência</label>
              <select name="referencia" defaultValue={modelo.referencia} className="select mt-1 w-full">
                <option value="checkin">Check-in</option>
                <option value="checkout">Checkout</option>
                <option value="criacao">Criação</option>
              </select>
            </div>
            <div>
              <label className="label">Offset (dias)</label>
              <input
                name="offset_dias"
                type="number"
                defaultValue={modelo.offset_dias}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Hora de envio</label>
              <input
                name="hora_envio"
                type="time"
                defaultValue={modelo.hora_envio ?? "09:00"}
                className="input mt-1 w-full"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="cursor-pointer flex items-center gap-2 text-sm text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked={modelo.ativo}
                  className="checkbox"
                />
                Ativo
              </label>
              <label className="cursor-pointer flex items-center gap-2 text-sm text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="eh_template"
                  defaultChecked={modelo.eh_template}
                  className="checkbox"
                />
                Template Meta
              </label>
            </div>
          </div>

          <div>
            <label className="label">Nome do template (Meta)</label>
            <input
              name="nome_template"
              className="input mt-1 w-full"
              defaultValue={modelo.nome_template ?? ""}
              placeholder="ex: your_template_name"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <label className="label">Mensagem</label>
            <textarea
              name="texto_template"
              required
              rows={12}
              defaultValue={modelo.texto_template}
              className="textarea mt-1 w-full"
              onChange={(e) => updatePreview(e.target.value)}
            />
          </div>

          <div className="card p-5 bg-cream/90">
            <div className="flex items-start justify-between gap-3">
              <p className="label">Preview</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(preview)}
                className="btn-ghost px-3 py-1 text-xs"
              >
                Copiar preview
              </button>
            </div>
            <div className="whitespace-pre-line rounded-xl border border-ocean/10 bg-white p-4 text-sm text-ocean/90">
              {preview}
            </div>
          </div>

          <div className="card p-5 bg-cream text-sm text-ocean/70">
            <p className="font-semibold mb-2">Variáveis disponíveis</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>{"{nome}"}</code> – primeiro nome do hóspede</li>
              <li><code>{"{nome_completo}"}</code> – nome completo</li>
              <li><code>{"{checkin}"}</code> – data de check-in</li>
              <li><code>{"{checkout}"}</code> – data de check-out</li>
              <li><code>{"{pessoas}"}</code> – número de hóspedes</li>
              <li><code>{"{valor}"}</code> – valor formatado</li>
              <li><code>{"{noites}"}</code> – quantidade de noites</li>
              <li><code>{"{casa}"}</code> – nome da casa</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm">
          {pending ? "Salvando..." : "Salvar modelo"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/mensagens")}
          className="btn-ghost px-6 py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
