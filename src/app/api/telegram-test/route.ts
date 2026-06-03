import { NextResponse } from "next/server";
import { enviarTelegram, telegramConfigurado } from "@/lib/telegram";

export const runtime = "nodejs";

// Endpoint protegido pelo middleware de sessão (chamado pelo painel autenticado).
export async function POST() {
  const tokenPresente = !!process.env.TELEGRAM_BOT_TOKEN;
  const chatPresente = !!process.env.TELEGRAM_CHAT_ID;

  if (!telegramConfigurado()) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          `Variáveis não detectadas em runtime — ` +
          `TELEGRAM_BOT_TOKEN: ${tokenPresente ? "OK" : "FALTANDO"}, ` +
          `TELEGRAM_CHAT_ID: ${chatPresente ? "OK" : "FALTANDO"}. ` +
          `No Coolify, marque "Available at Runtime" nessas variáveis e faça redeploy.`,
      },
      { status: 400 }
    );
  }

  const r = await enviarTelegram(
    "✅ Casa de Temporada — teste de conexão.\n\nSeu bot do Telegram está funcionando! " +
    "A partir de agora você receberá aqui os alertas das automações da jornada do hóspede."
  );

  // Se o Telegram recusar (ex.: você ainda não enviou /start ao bot), repassa o motivo real.
  return NextResponse.json(
    r.ok ? { ok: true } : { ok: false, erro: `Telegram recusou: ${r.erro}` },
    { status: r.ok ? 200 : 500 }
  );
}
