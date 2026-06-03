import { addDays, parseISO, set } from "date-fns";
import { query, queryOne } from "./db";
import { fmtData, fmtMoeda } from "./format";
import type { ModeloMensagem, Reserva, Hospede } from "./types";

// ------------------------------------------------------------
// 1) Renderização de variáveis
// {nome} {nome_completo} {checkin} {checkout} {pessoas} {valor} {noites} {casa}
// ------------------------------------------------------------
export function renderizarMensagem(
  texto: string,
  dados: { reserva: Reserva; hospede: Hospede | null }
): string {
  const { reserva, hospede } = dados;
  const ms =
    parseISO(reserva.data_checkout).getTime() -
    parseISO(reserva.data_checkin).getTime();
  const qtdNoites = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));

  const mapa: Record<string, string> = {
    nome: hospede?.nome?.split(" ")[0] ?? "tudo bem",
    nome_completo: hospede?.nome ?? "",
    checkin: fmtData(reserva.data_checkin),
    checkout: fmtData(reserva.data_checkout),
    pessoas: String(reserva.qtd_pessoas),
    valor: fmtMoeda(reserva.valor),
    noites: String(qtdNoites),
    casa: process.env.CASA_NOME ?? "nossa casa",
  };

  return texto.replace(/\{(\w+)\}/g, (full, chave) =>
    chave in mapa ? mapa[chave] : full
  );
}

// ------------------------------------------------------------
// 2) Data de disparo de um modelo para uma reserva
// ------------------------------------------------------------
export function calcularDataDisparo(modelo: ModeloMensagem, reserva: Reserva): Date {
  if (modelo.referencia === "criacao") return new Date();

  const baseISO =
    modelo.referencia === "checkout" ? reserva.data_checkout : reserva.data_checkin;

  let data = addDays(parseISO(baseISO), modelo.offset_dias);
  const [h, m] = (modelo.hora_envio || "09:00").split(":").map(Number);
  data = set(data, { hours: h || 9, minutes: m || 0, seconds: 0, milliseconds: 0 });
  return data;
}

// ------------------------------------------------------------
// 3) Agendar toda a jornada de mensagens de uma reserva
// ------------------------------------------------------------
export async function agendarMensagensDaReserva(
  reservaId: string
): Promise<{ agendadas: number; motivo?: string }> {
  const reserva = await queryOne<Reserva>(`select * from reservas where id = $1`, [reservaId]);
  if (!reserva) return { agendadas: 0, motivo: "Reserva não encontrada." };

  const hospede = reserva.hospede_id
    ? await queryOne<Hospede>(`select * from hospedes where id = $1`, [reserva.hospede_id])
    : null;

  if (!hospede || !hospede.telefone)
    return { agendadas: 0, motivo: "Reserva sem hóspede/telefone. Nenhuma mensagem agendada." };
  if (reserva.status_reserva === "cancelada")
    return { agendadas: 0, motivo: "Reserva cancelada." };

  const modelos = await query<ModeloMensagem>(
    `select * from modelos_mensagem where ativo = true`
  );
  if (modelos.length === 0) return { agendadas: 0, motivo: "Nenhum modelo ativo." };

  // Re-agendar: remove pendentes anteriores desta reserva
  await query(`delete from mensagens where reserva_id = $1 and status = 'agendada'`, [reservaId]);

  for (const modelo of modelos) {
    const quando = calcularDataDisparo(modelo, reserva);
    const conteudo = renderizarMensagem(modelo.texto_template, { reserva, hospede });
    await query(
      `insert into mensagens
        (reserva_id, hospede_id, modelo_id, canal, gatilho, conteudo_final, status, agendada_para)
       values ($1,$2,$3,$4,$5,$6,'agendada',$7)`,
      [reservaId, hospede.id, modelo.id, modelo.canal, modelo.gatilho, conteudo, quando.toISOString()]
    );
  }

  return { agendadas: modelos.length };
}

// ------------------------------------------------------------
// 4) Cancelar mensagens pendentes (ao cancelar reserva)
// ------------------------------------------------------------
export async function cancelarMensagensPendentes(reservaId: string) {
  await query(
    `update mensagens set status = 'cancelada' where reserva_id = $1 and status = 'agendada'`,
    [reservaId]
  );
}
