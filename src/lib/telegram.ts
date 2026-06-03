// Notificações via Telegram Bot API.
//
// Usado como canal de ALERTA para o anfitrião (você) — enquanto a API do
// WhatsApp não está ativa, as automações da jornada do hóspede são enviadas
// como alerta no seu Telegram, para você encaminhar manualmente.
//
// Configuração (variáveis de ambiente):
//   TELEGRAM_BOT_TOKEN  -> token do bot (BotFather / HTTP API)
//   TELEGRAM_CHAT_ID    -> seu ID de usuário no Telegram

interface ResultadoTelegram {
  ok: boolean;
  erro?: string;
}

export function telegramConfigurado(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function enviarTelegram(texto: string): Promise<ResultadoTelegram> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, erro: "Telegram não configurado (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)." };
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        disable_web_page_preview: true,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.ok) {
      return { ok: false, erro: data?.description ?? `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Falha de rede ao contatar o Telegram." };
  }
}
