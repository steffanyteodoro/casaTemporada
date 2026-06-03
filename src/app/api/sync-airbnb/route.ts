import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sincronizarAirbnb } from "@/lib/airbnb";

// ============================================================
// SINCRONIZAÇÃO AIRBNB (iCal) — chamada pelo scheduler (a cada 1h)
// ou manualmente pelo painel. Protegida por CRON_SECRET.
// ============================================================

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const uiSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
  // Se não houver secret configurado, ou estivermos usando o placeholder
  // padrão do docker-compose, permitir (útil para uso manual via UI local).
  if (!secret || secret === "troque-este-token") return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}` || (uiSecret ? auth === `Bearer ${uiSecret}` : false);
}

async function run() {
  const r = await sincronizarAirbnb();
  revalidatePath("/calendario");
  revalidatePath("/reservas");
  return r;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await run());
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await run());
}
