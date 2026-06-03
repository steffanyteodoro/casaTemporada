import { query } from "@/lib/db";
import { fmtMoeda, fmtData } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { DespesaForm } from "./DespesaForm";
import { ExcluirDespesaBtn } from "./ExcluirDespesaBtn";

export const dynamic = "force-dynamic";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const CATEGORIAS: Record<string, { label: string; cor: string }> = {
  limpeza:      { label: "Limpeza",       cor: "#7C5CBF" },
  manutencao:   { label: "Manutenção",    cor: "#E8A020" },
  material:     { label: "Material",      cor: "#3B82F6" },
  plataformas:  { label: "Plataformas",   cor: "#DA4167" },
  impostos:     { label: "Impostos",      cor: "#6B7FA3" },
  agua_luz_gas: { label: "Água/Luz/Gás",  cor: "#10B981" },
  internet:     { label: "Internet",      cor: "#083D77" },
  geral:        { label: "Geral",         cor: "#94A3B8" },
};

function catLabel(c: string) {
  return CATEGORIAS[c]?.label ?? c;
}
function catCor(c: string) {
  return CATEGORIAS[c]?.cor ?? "#94A3B8";
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function Financeiro({
  searchParams,
}: {
  searchParams: { m?: string; a?: string };
}) {
  const hoje = new Date();
  const ano = Number(searchParams.a ?? hoje.getFullYear());
  const mes = Number(searchParams.m ?? hoje.getMonth()); // 0-based

  const mesInicio = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const mesFim = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);

  // ── Dados financeiros do mês selecionado ────────────────────
  const [receitas, despesasMes, todosMeses, reservasMes] = await Promise.all([
    query<any>(
      `select r.id, r.data_checkin, r.data_checkout, r.valor, r.status_pagamento, r.origem,
              h.nome as hospede_nome
         from reservas r left join hospedes h on h.id = r.hospede_id
        where r.status_reserva <> 'cancelada'
          and r.origem <> 'bloqueio'
          and r.data_checkin >= $1 and r.data_checkin <= $2
        order by r.data_checkin asc`,
      [mesInicio, mesFim]
    ),
    query<any>(
      `select * from despesas where data >= $1 and data <= $2 order by data asc`,
      [mesInicio, mesFim]
    ),
    // sumário dos últimos 12 meses para o gráfico
    query<any>(
      `select
         date_trunc('month', r.data_checkin) as mes,
         coalesce(sum(r.valor),0) as receita,
         count(*) as qtd
       from reservas r
       where r.status_reserva <> 'cancelada' and r.origem <> 'bloqueio'
         and r.data_checkin >= (current_date - interval '11 months')
       group by 1 order by 1`
    ),
    // ocupação do mês selecionado: reservas (incl. Airbnb/bloqueio) que cruzam o mês
    query<any>(
      `select data_checkin, data_checkout from reservas
        where status_reserva <> 'cancelada'
          and data_checkin <= $2 and data_checkout > $1`,
      [mesInicio, mesFim]
    ),
  ]);

  const totalReceita = receitas.reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);
  const totalDespesas = despesasMes.reduce((s: number, d: any) => s + Number(d.valor), 0);
  const lucro = totalReceita - totalDespesas;

  // ── Inteligência de precificação ────────────────────────────
  const daqui30 = new Date(hoje);
  daqui30.setDate(daqui30.getDate() + 30);
  const daqui60 = new Date(hoje);
  daqui60.setDate(daqui60.getDate() + 60);

  const [reservas30, reservas60] = await Promise.all([
    query<any>(
      `select data_checkin, data_checkout from reservas
        where status_reserva <> 'cancelada'
          and data_checkin < $1 and data_checkout > $2`,
      [ymd(daqui30), ymd(hoje)]
    ),
    query<any>(
      `select data_checkin, data_checkout from reservas
        where status_reserva <> 'cancelada'
          and data_checkin < $1 and data_checkout > $2`,
      [ymd(daqui60), ymd(daqui30)]
    ),
  ]);

  function diasOcupados(reservas: any[], inicio: Date, fim: Date): number {
    const ocupados = new Set<string>();
    for (const r of reservas) {
      const ci = new Date(r.data_checkin + "T00:00:00");
      const co = new Date(r.data_checkout + "T00:00:00");
      for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
        const ds = ymd(d);
        if (ds >= ymd(inicio) && ds < ymd(fim)) ocupados.add(ds);
      }
    }
    return ocupados.size;
  }

  const ocup30 = diasOcupados(reservas30, hoje, daqui30);
  const ocup60 = diasOcupados(reservas60, daqui30, daqui60);
  const pct30 = Math.round((ocup30 / 30) * 100);
  const pct60 = Math.round((ocup60 / 30) * 100);

  // Ocupação do MÊS SELECIONADO (muda conforme você navega entre os meses)
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaMes = new Date(ano, mes, 1);
  const ultimoDiaMesExcl = new Date(ano, mes + 1, 1); // exclusivo
  const ocupMes = diasOcupados(reservasMes, primeiroDiaMes, ultimoDiaMesExcl);
  const pctMes = Math.round((ocupMes / diasNoMes) * 100);

  // Lacunas ≥ 2 dias nos próximos 30 dias
  function lacunas(reservas: any[], inicio: Date, fim: Date) {
    const ocupados = new Set<string>();
    for (const r of reservas) {
      const ci = new Date(r.data_checkin + "T00:00:00");
      const co = new Date(r.data_checkout + "T00:00:00");
      for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
        ocupados.add(ymd(d));
      }
    }
    const gaps: Array<{ inicio: string; fim: string; dias: number }> = [];
    let gapStart: string | null = null;
    let gapDias = 0;
    for (let d = new Date(inicio); d < fim; d.setDate(d.getDate() + 1)) {
      const ds = ymd(d);
      if (!ocupados.has(ds)) {
        if (!gapStart) gapStart = ds;
        gapDias++;
      } else {
        if (gapStart && gapDias >= 2) {
          gaps.push({ inicio: gapStart, fim: ds, dias: gapDias });
        }
        gapStart = null; gapDias = 0;
      }
    }
    if (gapStart && gapDias >= 2) {
      gaps.push({ inicio: gapStart, fim: ymd(fim), dias: gapDias });
    }
    return gaps;
  }

  const gaps30 = lacunas([...reservas30], hoje, daqui30);

  // Sugestão de preço
  type Sugestao = { tipo: "desconto" | "aumento" | "ok"; texto: string; detalhes: string };
  function gerarSugestao(): Sugestao {
    // Ocupação baixa (< 40%): sugere desconto, mais agressivo quanto mais vazio
    if (pct30 < 40) {
      const desc = pct30 < 20 ? "15–25%" : "8–15%";
      return {
        tipo: "desconto",
        texto: `Ocupação baixa — considere reduzir o preço`,
        detalhes: `${pct30}% ocupado nos próximos 30 dias. Desconto sugerido: ${desc} para atrair reservas de curto prazo.`,
      };
    }
    // Demanda alta (>= 70%): sugere aumento
    if (pct30 >= 70) {
      return {
        tipo: "aumento",
        texto: `Demanda alta — você pode cobrar mais`,
        detalhes: `${pct30}% ocupado nos próximos 30 dias. Aumento sugerido: 10–20% nas datas ainda abertas.`,
      };
    }
    // Mês atual ok, mas os 30 dias seguintes muito vazios: antecipa promoção
    if (pct60 < 20) {
      return {
        tipo: "desconto",
        texto: `Próximos 31–60 dias vazios — antecipe promoção`,
        detalhes: `Os próximos 30 dias vão razoavelmente (${pct30}%), mas o período seguinte tem só ${pct60}% de ocupação. Considere criar uma promoção agora para não deixar a agenda esvaziar.`,
      };
    }
    // Faixa intermediária (40–70%): saudável
    return {
      tipo: "ok",
      texto: `Ocupação saudável — mantenha o preço atual`,
      detalhes: `${pct30}% ocupado nos próximos 30 dias. Não há sinais de queda nem de excesso de demanda.`,
    };
  }

  const sugestao = gerarSugestao();

  // Navegação de meses
  const mesAntNum = mes === 0 ? 11 : mes - 1;
  const anoAnt = mes === 0 ? ano - 1 : ano;
  const mesProxNum = mes === 11 ? 0 : mes + 1;
  const anoProx = mes === 11 ? ano + 1 : ano;

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Gestão</p>
          <h2 className="font-display text-3xl text-ink">Financeiro</h2>
        </div>
        <div className="flex gap-2">
          <a href={`/financeiro?m=${mesAntNum}&a=${anoAnt}`} className="btn-ghost px-4 py-2 text-sm">← Anterior</a>
          <span className="btn-ghost px-4 py-2 text-sm font-semibold pointer-events-none">
            {MESES[mes]} {ano}
          </span>
          <a href={`/financeiro?m=${mesProxNum}&a=${anoProx}`} className="btn-ghost px-4 py-2 text-sm">Próximo →</a>
        </div>
      </header>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <p className="label">Receita</p>
          <p className="font-display text-2xl text-ocean mt-1">{fmtMoeda(totalReceita)}</p>
          <p className="text-xs text-ocean/60 mt-1">{receitas.length} reserva(s)</p>
        </div>
        <div className="card p-5">
          <p className="label">Despesas</p>
          <p className="font-display text-2xl text-coral mt-1">{fmtMoeda(totalDespesas)}</p>
          <p className="text-xs text-ocean/60 mt-1">{despesasMes.length} lançamento(s)</p>
        </div>
        <div className="card p-5">
          <p className="label">Lucro líquido</p>
          <p className={`font-display text-2xl mt-1 ${lucro >= 0 ? "text-emerald-700" : "text-magenta"}`}>
            {fmtMoeda(lucro)}
          </p>
          {totalReceita > 0 && (
            <p className="text-xs text-ocean/60 mt-1">
              Margem: {Math.round((lucro / totalReceita) * 100)}%
            </p>
          )}
        </div>
        <div className="card p-5">
          <p className="label">Ocupação ({MESES[mes]})</p>
          <p className="font-display text-2xl text-ink mt-1">{pctMes}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-ocean/10">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${pctMes}%`,
                background: pctMes >= 70 ? "#10B981" : pctMes >= 40 ? "#F4D35E" : "#DA4167",
              }}
            />
          </div>
          <p className="text-xs text-ocean/60 mt-1">{ocupMes} de {diasNoMes} dias</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* ── Inteligência de preços ── */}
        <section className="lg:col-span-1">
          <h3 className="font-display text-xl text-ink mb-4">Inteligência de preços</h3>
          <div
            className="card p-5 border-l-4 mb-4"
            style={{
              borderLeftColor:
                sugestao.tipo === "desconto" ? "#DA4167" :
                sugestao.tipo === "aumento" ? "#10B981" : "#083D77",
            }}
          >
            <p className="font-semibold text-sm text-ink">{sugestao.texto}</p>
            <p className="text-xs text-ocean/70 mt-2">{sugestao.detalhes}</p>
          </div>

          <div className="card p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ocean/70">Próx. 30 dias</span>
              <span className="font-semibold">{ocup30} / 30 dias — {pct30}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ocean/70">Dias 31–60</span>
              <span className="font-semibold">{ocup60} / 30 dias — {pct60}%</span>
            </div>
            {gaps30.length > 0 && (
              <div className="border-t border-ocean/10 pt-3">
                <p className="text-xs font-semibold text-ocean/60 uppercase tracking-wide mb-2">Lacunas abertas</p>
                {gaps30.slice(0, 4).map((g, i) => (
                  <div key={i} className="flex justify-between text-xs mb-1">
                    <span>{fmtData(g.inicio)} → {fmtData(g.fim)}</span>
                    <span className="font-semibold text-coral">{g.dias} dia(s)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico 12 meses */}
          {todosMeses.length > 0 && (
            <div className="card p-5 mt-4">
              <p className="label mb-3">Receita — últimos 12 meses</p>
              <div className="space-y-2">
                {todosMeses.map((m: any) => {
                  const d = new Date(m.mes);
                  const max = Math.max(...todosMeses.map((x: any) => Number(x.receita)));
                  const pct = max > 0 ? (Number(m.receita) / max) * 100 : 0;
                  return (
                    <div key={m.mes} className="flex items-center gap-2 text-xs">
                      <span className="w-8 text-ocean/60">{MESES[d.getMonth()]}</span>
                      <div className="flex-1 h-3 rounded-full bg-ocean/8">
                        <div
                          className="h-3 rounded-full bg-ocean"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-semibold">{fmtMoeda(Number(m.receita))}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Receitas do mês ── */}
        <section className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="font-display text-xl text-ink mb-4">Reservas — {MESES[mes]}/{ano}</h3>
            <div className="card overflow-hidden">
              {receitas.length === 0 ? (
                <p className="p-6 text-sm text-ocean/60">Nenhuma reserva com valor neste mês.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ocean/60 border-b border-ocean/10">
                      <th className="px-4 py-3 font-semibold">Hóspede</th>
                      <th className="px-4 py-3 font-semibold">Período</th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitas.map((r: any) => (
                      <tr key={r.id} className="border-b border-ocean/10 last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{r.hospede_nome ?? "—"}</td>
                        <td className="px-4 py-3 text-ink/70 text-xs">
                          {fmtData(r.data_checkin)} → {fmtData(r.data_checkout)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-ocean">{fmtMoeda(r.valor)}</td>
                        <td className="px-4 py-3"><Badge status={r.status_pagamento} /></td>
                      </tr>
                    ))}
                    <tr className="bg-ocean/5">
                      <td colSpan={2} className="px-4 py-3 font-semibold text-ink">Total receita</td>
                      <td className="px-4 py-3 font-bold text-ocean">{fmtMoeda(totalReceita)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Despesas ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-ink">Despesas — {MESES[mes]}/{ano}</h3>
            </div>

            {/* Formulário nova despesa */}
            <DespesaForm categorias={Object.entries(CATEGORIAS).map(([v, c]) => ({ value: v, label: c.label }))} />

            {/* Lista */}
            {despesasMes.length > 0 && (
              <div className="card overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ocean/60 border-b border-ocean/10">
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Descrição</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasMes.map((d: any) => (
                      <tr key={d.id} className="border-b border-ocean/10 last:border-0">
                        <td className="px-4 py-3 text-ink/70 whitespace-nowrap">{fmtData(String(d.data).slice(0, 10))}</td>
                        <td className="px-4 py-3 text-ink font-medium">{d.descricao}</td>
                        <td className="px-4 py-3">
                          <span
                            className="badge text-white"
                            style={{ background: catCor(d.categoria) }}
                          >
                            {catLabel(d.categoria)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-coral">{fmtMoeda(Number(d.valor))}</td>
                        <td className="px-4 py-3 text-right">
                          <ExcluirDespesaBtn id={d.id} />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-coral/8">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-ink">Total despesas</td>
                      <td className="px-4 py-3 font-bold text-coral">{fmtMoeda(totalDespesas)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
