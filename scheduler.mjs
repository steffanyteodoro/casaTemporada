// ============================================================
// Scheduler — dispara as automações chamando o app por HTTP.
// Roda com Node puro (sem dependências): usa fetch global (Node 18+)
// e setInterval. Definido como serviço separado no docker-compose.
//
//   - /api/cron        a cada 15 minutos  (envio de mensagens)
//   - /api/sync-airbnb a cada 60 minutos  (importa calendário Airbnb)
// ============================================================

const APP_URL = process.env.APP_URL || "http://app:3000";
const CRON_SECRET = process.env.CRON_SECRET || "";

const headers = CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {};

async function chamar(rota) {
  try {
    const resp = await fetch(`${APP_URL}${rota}`, { method: "POST", headers });
    const data = await resp.json().catch(() => ({}));
    console.log(`[scheduler] ${rota} ->`, JSON.stringify(data));
  } catch (e) {
    console.error(`[scheduler] erro em ${rota}:`, e.message);
  }
}

const MIN = 60 * 1000;

console.log("[scheduler] iniciado. App:", APP_URL);

// Aguarda o app subir antes do primeiro disparo.
setTimeout(() => {
  chamar("/api/cron");
  chamar("/api/sync-airbnb");
}, 20 * 1000);

// Mensagens: a cada 15 minutos
setInterval(() => chamar("/api/cron"), 15 * MIN);

// Airbnb: a cada 60 minutos
setInterval(() => chamar("/api/sync-airbnb"), 60 * MIN);
