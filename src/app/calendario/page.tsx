import Link from "next/link";
import { query } from "@/lib/db";
import { SyncAirbnbBtn } from "./SyncAirbnbBtn";

export const dynamic = "force-dynamic";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

type TipoDia = "checkin" | "checkout" | "meio";

interface DiaOcupado {
  reserva: any;
  tipo: TipoDia;
}

const estiloOrigem = (origem: string, faxina = false): { bg: string; text: string; border: string } => {
  if (faxina)
    return { bg: "#7C5CBF", text: "#F0EBFF", border: "#6247A3" };
  if (origem === "airbnb")
    return { bg: "#C97B10", text: "#FFF8E8", border: "#A86409" };
  if (origem === "bloqueio")
    return { bg: "#6B7FA3", text: "#EDF0F7", border: "#546090" };
  return { bg: "#083D77", text: "#EBEBD3", border: "#062C5C" };
};

function isFaxina(r: any): boolean {
  if (r.origem !== "bloqueio") return false;
  const ci = new Date(r.data_checkin + "T00:00:00");
  const co = new Date(r.data_checkout + "T00:00:00");
  return Math.round((co.getTime() - ci.getTime()) / 86400000) === 1;
}

const legendaOrigem = (origem: string, faxina = false) =>
  faxina ? "🧹 Faxina" : origem === "airbnb" ? "Airbnb" : origem === "bloqueio" ? "Bloqueio" : "Manual";

export default async function Calendario({
  searchParams,
}: {
  searchParams: { m?: string; a?: string };
}) {
  const hoje = new Date();
  const ano = Number(searchParams.a ?? hoje.getFullYear());
  const mes = Number(searchParams.m ?? hoje.getMonth());

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const offsetInicio = primeiroDia.getDay();

  const reservas = await query<any>(
    `select r.*, h.nome as hospede_nome
       from reservas r left join hospedes h on h.id = r.hospede_id
      where r.status_reserva <> 'cancelada'
        and r.data_checkin <= $1 and r.data_checkout >= $2`,
    [ymd(ultimoDia), ymd(primeiroDia)]
  );

  const ocupacao: Record<string, DiaOcupado> = {};
  for (const r of reservas) {
    const ci = new Date(r.data_checkin + "T00:00:00");
    const co = new Date(r.data_checkout + "T00:00:00");
    const dias: string[] = [];
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      dias.push(ymd(d));
    }
    dias.forEach((dia, idx) => {
      const tipo: TipoDia =
        idx === 0 ? "checkin" : idx === dias.length - 1 ? "checkout" : "meio";
      ocupacao[dia] = { reserva: r, tipo };
    });
  }

  const celulas: (number | null)[] = [];
  for (let i = 0; i < offsetInicio; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);

  const mesAnt = mes === 0 ? 11 : mes - 1;
  const anoAnt = mes === 0 ? ano - 1 : ano;
  const mesProx = mes === 11 ? 0 : mes + 1;
  const anoProx = mes === 11 ? ano + 1 : ano;

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Disponibilidade</p>
          <h2 className="font-display text-3xl text-ink">
            {MESES[mes]} <span className="text-coral">{ano}</span>
          </h2>
        </div>
        <div className="flex gap-2 items-center">
          <SyncAirbnbBtn />
          <Link href={`/calendario?m=${mesAnt}&a=${anoAnt}`} className="btn-ghost px-4 py-2 text-sm">← Anterior</Link>
          <Link href={`/calendario?m=${mesProx}&a=${anoProx}`} className="btn-ghost px-4 py-2 text-sm">Próximo →</Link>
        </div>
      </header>

      <div className="card p-5">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DIAS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-ocean/50 py-1">{d}</div>
          ))}
        </div>

        {/* Células do calendário */}
        <div className="grid grid-cols-7 gap-1.5">
          {celulas.map((dia, i) => {
            if (dia === null) return <div key={i} />;

            const dataStr = ymd(new Date(ano, mes, dia));
            const slot = ocupacao[dataStr];
            const ehHoje = dataStr === ymd(hoje);

            if (!slot) {
              return (
                <div
                  key={i}
                  className="rounded-xl flex flex-col items-center justify-start pt-2 pb-1 min-h-[4.5rem]"
                  style={{
                    background: ehHoje ? "rgba(8,61,119,0.07)" : "transparent",
                    border: ehHoje ? "2px solid #083D77" : "1px solid rgba(8,61,119,0.12)",
                  }}
                >
                  <span className={`text-xs font-semibold ${ehHoje ? "text-ocean" : "text-ocean/50"}`}>{dia}</span>
                </div>
              );
            }

            const { reserva: r, tipo } = slot;
            const faxina = isFaxina(r);
            const estilo = estiloOrigem(r.origem, faxina);
            const primeiroNome = faxina ? "Faxina" : (r.hospede_nome?.split(" ")[0] ?? legendaOrigem(r.origem, faxina));

            return (
              <Link
                key={i}
                href={`/reservas/${r.id}`}
                className="rounded-xl flex flex-col justify-between min-h-[4.5rem] px-1.5 pt-1.5 pb-1.5 transition-opacity hover:opacity-90"
                style={{
                  background: estilo.bg,
                  border: ehHoje ? `2px solid ${estilo.border}` : `1px solid ${estilo.border}`,
                  boxShadow: "0 2px 8px -2px rgba(0,0,0,0.18)",
                }}
                title={faxina ? "Faxina" : `${r.hospede_nome ?? r.origem} · ${tipo === "checkin" ? "Entrada" : tipo === "checkout" ? "Saída" : "Hóspede"}`}
              >
                <span
                  className="text-xs font-semibold leading-none"
                  style={{ color: estilo.text, opacity: 0.75 }}
                >
                  {dia}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-[11px] font-bold leading-tight truncate"
                    style={{ color: estilo.text }}
                  >
                    {primeiroNome}
                  </span>
                  {tipo !== "meio" && (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wide leading-none"
                      style={{ color: estilo.text, opacity: 0.7 }}
                    >
                      {tipo === "checkin" ? "↵ Entrada" : "↳ Saída"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-5 mt-4 text-xs text-ocean/70">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md inline-block" style={{ background: "#083D77" }} />
          Manual
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md inline-block" style={{ background: "#C97B10" }} />
          Airbnb
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md inline-block" style={{ background: "#6B7FA3" }} />
          Bloqueio
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md inline-block" style={{ background: "#7C5CBF" }} />
          Faxina
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md inline-block border-2 border-ocean" style={{ background: "transparent" }} />
          Hoje
        </span>
      </div>
    </div>
  );
}
