import Link from "next/link";
import { query } from "@/lib/db";
import { fmtDataHora } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { RodarCronBtn } from "./RodarCronBtn";
import { TestarTelegramBtn } from "./TestarTelegramBtn";

export const dynamic = "force-dynamic";

const gatilhoLabel: Record<string, string> = {
  confirmacao: "Confirmação",
  antes_checkin: "Antes do check-in",
  dia_checkin: "Dia do check-in",
  durante: "Durante a estadia",
  antes_checkout: "Antes do check-out",
  pos_checkout: "Pós-estadia",
  reconvite: "Reconvite",
};

export default async function Mensagens() {
  const [modelos, log] = await Promise.all([
    query<any>(`select * from modelos_mensagem order by offset_dias asc`),
    query<any>(
      `select m.*, h.nome as hospede_nome
         from mensagens m left join hospedes h on h.id = m.hospede_id
        order by m.agendada_para desc limit 30`
    ),
  ]);

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Automação</p>
          <h2 className="font-display text-3xl text-ink">Mensagens</h2>
        </div>
        <div className="flex items-start gap-2">
          <TestarTelegramBtn />
          <RodarCronBtn />
        </div>
      </header>

      <section className="mb-10">
        <h3 className="font-display text-xl text-ink mb-4">Modelos da jornada</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {modelos.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="badge" style={{ background: "#DDE7F5", color: "#083D77" }}>
                  {gatilhoLabel[m.gatilho] ?? m.gatilho}
                </span>
                <span className="text-xs text-ocean/60">
                  {m.referencia === "criacao"
                    ? "na criação"
                    : `${m.offset_dias >= 0 ? "+" : ""}${m.offset_dias}d ${m.referencia} · ${String(m.hora_envio).slice(0, 5)}`}
                </span>
              </div>
              <p className="font-medium text-ink text-sm mb-1">{m.nome}</p>
              <p className="text-xs text-ocean/70 whitespace-pre-line line-clamp-4">{m.texto_template}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Link href={`/mensagens/${m.id}`} className="btn-ghost px-3 py-2 text-xs">
                  Editar
                </Link>
                {m.eh_template && (
                  <span className="badge" style={{ background: "#FDE8A4", color: "#083D77" }}>Template Meta</span>
                )}
                {!m.ativo && (
                  <span className="badge" style={{ background: "#EBEBD3", color: "#083D77" }}>Inativo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-xl text-ink mb-4">Histórico de comunicação</h3>
        <div className="card overflow-hidden">
          {log.length === 0 ? (
            <p className="p-8 text-center text-sm text-ocean/60">Nenhuma mensagem registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ocean/60 border-b border-ocean/10">
                    <th className="px-5 py-3 font-semibold">Hóspede</th>
                    <th className="px-5 py-3 font-semibold">Etapa</th>
                    <th className="px-5 py-3 font-semibold">Agendada</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((m) => (
                    <tr key={m.id} className="border-b border-ocean/10 last:border-0 hover:bg-cream/80">
                      <td className="px-5 py-3 font-medium text-ink">{m.hospede_nome ?? "—"}</td>
                      <td className="px-5 py-3 text-ink/70">{gatilhoLabel[m.gatilho] ?? m.gatilho}</td>
                      <td className="px-5 py-3 text-ink/70">{fmtDataHora(m.agendada_para)}</td>
                      <td className="px-5 py-3">
                        <Badge status={m.status} />
                        {m.erro && <span className="block text-[10px] text-[#a32c2c] mt-1">{m.erro}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
