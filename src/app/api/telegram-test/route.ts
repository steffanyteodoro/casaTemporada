import { NextResponse } from "next/server";
import { enviarTelegram, telegramConfigurado } from "@/lib/telegram";

export const runtime = "nodejs";

// Endpoint protegido pelo middleware de sessão (chamado pelo painel autenticado).
export async function POST() {
  if (!telegramConfigurado()) {
    return NextResponse.json(
      { ok: false, erro: "Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID nas variáveis de ambiente." },
      { status: 400 }
    );
  }

  const r = await enviarTelegram(
    "✅ Casa de Temporada — teste de conexão.\n\nSeu bot do Telegram está funcionando! " +
    "A partir de agora você receberá aqui os alertas das automações da jornada do hóspede."
  );

  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
