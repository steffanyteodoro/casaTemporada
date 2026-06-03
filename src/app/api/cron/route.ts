import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enviarWhatsApp } from "@/lib/whatsapp";

// ============================================================
// MOTOR DE AUTOMAÇÃO — dispara mensagens agendadas que já venceram.
// Chamado periodicamente pelo serviço "scheduler" (docker-compose).
// Protegido por CRON_SECRET.
// ============================================================

const TOLERANCIA_HORAS = 48; // não envia mensagens muito atrasadas

interface LinhaMsg {
  id: string;
  conteudo_final: string | null;
  agendada_para: string;
  hospede_telefone: string | null;
}

async function processar() {
  const agora = Date.now();
  const limiteAntigo = agora - TOLERANCIA_HORAS * 3600 * 1000;

  let pendentes: LinhaMsg[];
  try {
    pendentes = await query<LinhaMsg>(
      `select m.id, m.conteudo_final, m.agendada_para, h.telefone as hospede_telefone
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

  for (const msg of pendentes) {
    if (new Date(msg.agendada_para).getTime() < limiteAntigo) {
      await query(
        `update mensagens set status='cancelada', erro='Expirou janela de tolerância' where id=$1`,
        [msg.id]
      );
      expiradas++;
      continue;
    }

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

  return { ok: true, processadas: pendentes.length, enviadas, falhas, expiradas };
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
