import Link from "next/link";
import { query } from "@/lib/db";
import { fmtData, fmtDataHora, fmtMoeda } from "@/lib/format";
import { Badge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const hoje = new Date().toISOString().slice(0, 10);

  let proxCheckin: any[] = [];
  let pendentes: any[] = [];
  let totais: any[] = [];
  let erroBanco: string | null = null;

  try {
    [proxCheckin, pendentes, totais] = await Promise.all([
      query<any>(
        `select r.*, h.nome as hospede_nome
           from reservas r left join hospedes h on h.id = r.hospede_id
          where r.status_reserva = 'confirmada' and r.data_checkin >= $1
          order by r.data_checkin asc limit 5`,
        [hoje]
      ),
      query<any>(
        `select m.*, h.nome as hospede_nome
           from mensagens m left join hospedes h on h.id = m.hospede_id
          where m.status = 'agendada'
          order by m.agendada_para asc limit 6`
      ),
      query<any>(
        `select count(*)::int as total, coalesce(sum(valor),0) as faturamento
           from reservas
          where status_reserva = 'confirmada' and data_checkin >= $1`,
        [hoje]
      ),
    ]);
  } catch (e: any) {
    erroBanco = e?.message ?? "Falha ao conectar ao banco de dados.";
  }

  const totalReservas = totais[0]?.total ?? 0;
  const faturamento = Number(totais[0]?.faturamento ?? 0);

  if (erroBanco) {
    return (
      <div>
        <header className="mb-8">
          <p className="label">Visão geral</p>
          <h2 className="font-display text-3xl text-ink">Painel</h2>
        </header>
        <div className="card p-6 border-l-4" style={{ borderLeftColor: "#DA4167" }}>
          <p className="font-semibold text-ink">Não foi possível carregar os dados</p>
          <p className="text-sm text-ocean/70 mt-1">
            Houve um problema ao acessar o banco de dados. Tente recarregar a página em instantes.
          </p>
          <p className="text-xs text-ocean/40 mt-3 font-mono break-words">{erroBanco}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Visão geral</p>
          <h2 className="font-display text-3xl text-ink">Painel</h2>
        </div>
        <Link href="/reservas/nova" className="btn-primary px-5 py-2.5 text-sm">+ Nova reserva</Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="label">Reservas futuras</p>
          <p className="font-display text-4xl text-ink mt-1">{totalReservas}</p>
        </div>
        <div className="card p-5">
          <p className="label">Faturamento previsto</p>
          <p className="font-display text-3xl text-ocean mt-1">{fmtMoeda(faturamento)}</p>
        </div>
        <div className="card p-5">
          <p className="label">Mensagens na fila</p>
          <p className="font-display text-4xl text-coral mt-1">{pendentes.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-6">
          <h3 className="font-display text-xl text-ink mb-4">Próximos check-ins</h3>
          {proxCheckin.length === 0 ? (
            <p className="text-sm text-ocean/60">Nenhum check-in agendado.</p>
          ) : (
            <ul className="space-y-3">
              {proxCheckin.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{r.hospede_nome ?? "Sem hóspede"}</p>
                    <p className="text-xs text-ocean/60">
                      {fmtData(r.data_checkin)} → {fmtData(r.data_checkout)} · {r.qtd_pessoas} pessoa(s)
                    </p>
                  </div>
                  <Badge status={r.origem} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h3 className="font-display text-xl text-ink mb-4">Próximas mensagens</h3>
          {pendentes.length === 0 ? (
            <p className="text-sm text-ocean/60">Nada agendado no momento.</p>
          ) : (
            <ul className="space-y-3">
              {pendentes.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">
                      {m.hospede_nome ?? "—"}{" "}
                      <span className="text-xs font-normal text-ocean/60">· {m.gatilho}</span>
                    </p>
                    <p className="text-xs text-ocean/60">{fmtDataHora(m.agendada_para)}</p>
                  </div>
                  <Badge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
