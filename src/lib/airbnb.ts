import ical from "node-ical";
import { query } from "./db";

// Converte um Date para 'YYYY-MM-DD' (eventos all-day do iCal vêm em UTC midnight)
function toYMD(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export interface ResultadoSync {
  ok: boolean;
  importadas: number;
  atualizadas: number;
  conflitos: number;
  detalhes: string[];
  erro?: string;
}

// ------------------------------------------------------------
// Sincroniza o calendário do Airbnb (URL .ics) com a tabela reservas.
//
// O iCal do Airbnb traz apenas DATAS bloqueadas (sem dados do hóspede).
// Eventos "Reserved" viram origem 'airbnb'; bloqueios manuais do anfitrião
// no Airbnb viram origem 'bloqueio'. Em ambos os casos as datas ficam
// ocupadas no calendário, evitando overbooking com reservas manuais.
//
// DTEND no iCal é exclusivo (= dia do check-out), o que casa perfeitamente
// com o nosso modelo de intervalo [check-in, check-out).
// ------------------------------------------------------------
export async function sincronizarAirbnb(): Promise<ResultadoSync> {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) {
    return {
      ok: false,
      importadas: 0,
      atualizadas: 0,
      conflitos: 0,
      detalhes: [],
      erro: "AIRBNB_ICAL_URL não configurada.",
    };
  }

  let dados: Record<string, any>;
  try {
    dados = (await ical.async.fromURL(url)) as Record<string, any>;
  } catch (e: any) {
    return {
      ok: false,
      importadas: 0,
      atualizadas: 0,
      conflitos: 0,
      detalhes: [],
      erro: "Falha ao buscar o iCal: " + (e?.message ?? e),
    };
  }

  let importadas = 0;
  let atualizadas = 0;
  let conflitos = 0;
  const detalhes: string[] = [];

  for (const k of Object.keys(dados)) {
    const ev = dados[k];
    if (!ev || ev.type !== "VEVENT" || !ev.start || !ev.end) continue;

    const checkin = toYMD(ev.start);
    const checkout = toYMD(ev.end);
    if (checkout <= checkin) continue;

    const uid = String(ev.uid || `${checkin}_${checkout}`);
    const summary = String(ev.summary ?? "").toLowerCase();
    const origem = summary.includes("reserved") ? "airbnb" : "bloqueio";

    try {
      const existente = await query(`select id from reservas where id_externo_airbnb = $1`, [uid]);
      if (existente.length > 0) {
        await query(
          `update reservas
             set data_checkin = $2, data_checkout = $3, origem = $4, status_reserva = 'confirmada'
           where id_externo_airbnb = $1`,
          [uid, checkin, checkout, origem]
        );
        atualizadas++;
      } else {
        await query(
          `insert into reservas
             (origem, id_externo_airbnb, data_checkin, data_checkout, qtd_pessoas, status_reserva)
           values ($1, $2, $3, $4, 1, 'confirmada')`,
          [origem, uid, checkin, checkout]
        );
        importadas++;
      }
    } catch (e: any) {
      // 23P01 = exclusion_violation (conflito com outra reserva ativa)
      if (e?.code === "23P01") {
        conflitos++;
        detalhes.push(`Conflito: ${checkin} a ${checkout} já está ocupado por outra reserva.`);
      } else {
        detalhes.push(`Erro em evento ${uid}: ${e?.message ?? e}`);
      }
    }
  }

  return { ok: true, importadas, atualizadas, conflitos, detalhes };
}
