import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { enviarTelegram, telegramConfigurado } from "@/lib/telegram";

// ============================================================
// MOTOR DE AUTOMAÇÃO — dispara mensagens agendadas que já venceram.
// Chamado periodicamente pelo serviço "scheduler" (docker-compose).
// Protegido por CRON_SECRET.
//
// Canais (nesta ordem de prioridade):
//   1) WhatsApp Cloud API (se WHATSAPP_* configurado) — envia ao hóspede.
//   2) Telegram (se TELEGRAM_* configurado) — alerta VOCÊ para encaminhar.
//   3) Simulado (loga no console).
// ============================================================

const TOLERANCIA_HORAS = 48; // não envia mensagens muito atrasadas

const gatilhoLabel: Record<string, string> = {
  confirmacao: "Confirmação",
  antes_checkin: "Antes do check-in",
  dia_checkin: "Dia do check-in",
  durante: "Durante a estadia",
  antes_checkout: "Antes do check-out",
  pos_checkout: "Pós-estadia",
  reconvite: "Reconvite",
};

interface LinhaMsg {
  id: string;
  conteudo_final: string | null;
  agendada_para: string;
  gatilho: string;
  hospede_nome: string | null;
  hospede_telefone: string | null;
}

async function processar() {
  const agora = Date.now();
  const limiteAntigo = agora - TOLERANCIA_HORAS * 3600 * 1000;

  let pendentes: LinhaMsg[];
  try {
    pendentes = await query<LinhaMsg>(
      `select m.id, m.conteudo_final, m.agendada_para, m.gatilho,
              h.nome as hospede_nome, h.telefone as hospede_telefone
         from mensagens m
         left join hospedes h on h.id = m.hospede_id
        where m.status = 'agendada' and m.agendada_para <= now()
        order by m.agendada_para asc
        limit 50`
    );
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro de banco", processadas: 0 };
  }

  let enviadas = 0;
  let falhas = 0;
  let expiradas = 0;

  const usarWhatsAppReal = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const usarTelegram = !usarWhatsAppReal && telegramConfigurado();

  for (const msg of pendentes) {
    if (new Date(msg.agendada_para).getTime() < limiteAntigo) {
      await query(
        `update mensagens set status='cancelada', erro='Expirou janela de tolerância' where id=$1`,
        [msg.id]
      );
      expiradas++;
      continue;
    }

    // Canal 2: Telegram — alerta o anfitrião para encaminhar manualmente.
    if (usarTelegram) {
      const etapa = gatilhoLabel[msg.gatilho] ?? msg.gatilho;
      const alerta =
        `🔔 Hora de enviar uma mensagem (${etapa})\n\n` +
        `👤 ${msg.hospede_nome ?? "Hóspede"}\n` +
        `📱 ${msg.hospede_telefone ?? "telefone não cadastrado"}\n\n` +
        `✍️ Mensagem para enviar:\n${msg.conteudo_final ?? ""}`;
      const r = await enviarTelegram(alerta);
      if (r.ok) {
        await query(`update mensagens set status='enviada', enviada_em=now() where id=$1`, [msg.id]);
        enviadas++;
      } else {
        await query(`update mensagens set status='falhou', erro=$2 where id=$1`, [msg.id, r.erro ?? "Erro Telegram"]);
        falhas++;
      }
      continue;
    }

    // Canais 1 e 3: WhatsApp (real ou simulado) — exige telefone do hóspede.
    if (!msg.hospede_telefone) {
      await query(`update mensagens set status='falhou', erro='Hóspede sem telefone' where id=$1`, [msg.id]);
      falhas++;
      continue;
    }

    const r = await enviarWhatsApp(msg.hospede_telefone, msg.conteudo_final ?? "");
    if (r.ok) {
      await query(`update mensagens set status='enviada', enviada_em=now() where id=$1`, [msg.id]);
      enviadas++;
    } else {
      await query(`update mensagens set status='falhou', erro=$2 where id=$1`, [msg.id, r.erro ?? "Erro"]);
      falhas++;
    }
  }

  return { ok: true, processadas: pendentes.length, enviadas, falhas, expiradas, canal: usarWhatsAppReal ? "whatsapp" : usarTelegram ? "telegram" : "simulado" };
}

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await processar());
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await processar());
}
