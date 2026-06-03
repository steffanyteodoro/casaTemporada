// Abstração de envio de WhatsApp.
//
// Em produção, usa a WhatsApp Cloud API (Meta). Se as credenciais não
// estiverem configuradas, opera em MODO SIMULADO (loga e "envia" com
// sucesso fake), permitindo testar todo o fluxo sem custo/conta.
//
// IMPORTANTE: mensagens proativas fora da janela de 24h exigem TEMPLATE
// aprovado pela Meta. Texto livre só funciona dentro da janela de 24h
// após o hóspede ter enviado uma mensagem. Veja README.

interface ResultadoEnvio {
  ok: boolean;
  id?: string;
  erro?: string;
  simulado?: boolean;
}

export async function enviarWhatsApp(
  telefoneE164: string,
  texto: string
): Promise<ResultadoEnvio> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v20.0";

  // Modo simulado (sem credenciais) — ótimo para desenvolvimento.
  if (!phoneNumberId || !token) {
    console.log(
      `[whatsapp:simulado] -> ${telefoneE164}\n${texto}\n---------------------------`
    );
    return { ok: true, id: "sim_" + Date.now(), simulado: true };
  }

  const para = telefoneE164.replace("+", "");
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: para,
        type: "text",
        text: { body: texto },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return {
        ok: false,
        erro: data?.error?.message ?? `HTTP ${resp.status}`,
      };
    }
    return { ok: true, id: data?.messages?.[0]?.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Falha de rede" };
  }
}
