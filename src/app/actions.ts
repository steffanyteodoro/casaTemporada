"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { normalizarTelefone } from "@/lib/format";
import { agendarMensagensDaReserva, cancelarMensagensPendentes } from "@/lib/messages";

// ------------------------------------------------------------
// Criar reserva manual + hóspede (se novo) + agendar mensagens
// ------------------------------------------------------------
export async function criarReservaManual(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const email = String(formData.get("email") ?? "").trim() || null;
  const checkin = String(formData.get("data_checkin") ?? "");
  const checkout = String(formData.get("data_checkout") ?? "");
  const pessoas = Number(formData.get("qtd_pessoas") ?? 1);
  const valorRaw = String(formData.get("valor") ?? "").replace(/\./g, "").replace(",", ".");
  const valor = valorRaw ? Number(valorRaw) : null;
  const statusPagamento = String(formData.get("status_pagamento") ?? "pendente");
  const obs = String(formData.get("observacoes") ?? "").trim() || null;

  if (!nome) return { ok: false, erro: "Informe o nome do hóspede." };
  if (!checkin || !checkout) return { ok: false, erro: "Informe check-in e check-out." };
  if (checkout <= checkin) return { ok: false, erro: "O check-out deve ser depois do check-in." };

  // 1) Hóspede: reusa pelo telefone, senão cria
  let hospedeId: string | null = null;
  if (telefone) {
    const existente = await queryOne<{ id: string }>(
      `select id from hospedes where telefone = $1`,
      [telefone]
    );
    hospedeId = existente?.id ?? null;
  }
  if (!hospedeId) {
    const novo = await queryOne<{ id: string }>(
      `insert into hospedes (nome, telefone, email) values ($1,$2,$3) returning id`,
      [nome, telefone, email]
    );
    hospedeId = novo!.id;
  }

  // 2) Reserva (a constraint de exclusão do banco barra overbooking)
  let reservaId: string;
  try {
    const r = await queryOne<{ id: string }>(
      `insert into reservas
         (hospede_id, origem, data_checkin, data_checkout, qtd_pessoas, valor, status_pagamento, status_reserva, observacoes)
       values ($1,'manual',$2,$3,$4,$5,$6,'confirmada',$7)
       returning id`,
      [hospedeId, checkin, checkout, pessoas, valor, statusPagamento, obs]
    );
    reservaId = r!.id;
  } catch (e: any) {
    if (e?.code === "23P01")
      return { ok: false, erro: "Conflito de datas: já existe reserva ativa nesse período." };
    return { ok: false, erro: "Erro ao criar reserva: " + (e?.message ?? e) };
  }

  // 3) Agendar a jornada de mensagens
  const res = await agendarMensagensDaReserva(reservaId);

  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/");
  return { ok: true, reservaId, mensagens: res.agendadas, aviso: res.motivo };
}

// ------------------------------------------------------------
// Cancelar reserva
// ------------------------------------------------------------
export async function cancelarReserva(reservaId: string) {
  try {
    await query(`update reservas set status_reserva = 'cancelada' where id = $1`, [reservaId]);
    await cancelarMensagensPendentes(reservaId);
    revalidatePath("/reservas");
    revalidatePath("/calendario");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro" };
  }
}

export async function atualizarReserva(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const email = String(formData.get("email") ?? "").trim() || null;
  const checkin = String(formData.get("data_checkin") ?? "").trim();
  const checkout = String(formData.get("data_checkout") ?? "").trim();
  const pessoas = Number(formData.get("qtd_pessoas") ?? 1);
  const valorRaw = String(formData.get("valor") ?? "").replace(/\./g, "").replace(",", ".");
  const valor = valorRaw ? Number(valorRaw) : null;
  const statusPagamento = String(formData.get("status_pagamento") ?? "pendente");
  const statusReserva = String(formData.get("status_reserva") ?? "confirmada");
  const obs = String(formData.get("observacoes") ?? "").trim() || null;

  if (!id) return { ok: false, erro: "Reserva inválida." };
  if (!nome) return { ok: false, erro: "Informe o nome do hóspede." };
  if (!checkin || !checkout) return { ok: false, erro: "Informe check-in e check-out." };
  if (checkout <= checkin) return { ok: false, erro: "O check-out deve ser depois do check-in." };

  const reservaExistente = await queryOne<{ hospede_id: string | null }>(
    `select hospede_id from reservas where id = $1`,
    [id]
  );
  if (!reservaExistente) return { ok: false, erro: "Reserva não encontrada." };

  let hospedeId = reservaExistente.hospede_id;
  if (hospedeId) {
    await query(
      `update hospedes set nome=$2, telefone=$3, email=$4 where id=$1`,
      [hospedeId, nome, telefone || null, email]
    );
  } else {
    if (telefone) {
      const existente = await queryOne<{ id: string }>(
        `select id from hospedes where telefone = $1`,
        [telefone]
      );
      hospedeId = existente?.id ?? null;
    }
    if (!hospedeId) {
      const novo = await queryOne<{ id: string }>(
        `insert into hospedes (nome, telefone, email) values ($1,$2,$3) returning id`,
        [nome, telefone || null, email]
      );
      hospedeId = novo!.id;
    }
  }

  try {
    await query(
      `update reservas
         set hospede_id = $2,
             data_checkin = $3,
             data_checkout = $4,
             qtd_pessoas = $5,
             valor = $6,
             status_pagamento = $7,
             status_reserva = $8,
             observacoes = $9
       where id = $1`,
      [id, hospedeId, checkin, checkout, pessoas, valor, statusPagamento, statusReserva, obs]
    );
  } catch (e: any) {
    if (e?.code === "23P01")
      return { ok: false, erro: "Conflito de datas: já existe reserva ativa nesse período." };
    return { ok: false, erro: "Erro ao atualizar reserva: " + (e?.message ?? e) };
  }

  revalidatePath("/reservas");
  revalidatePath("/calendario");
  revalidatePath("/");
  return { ok: true, reservaId: id };
}

// ------------------------------------------------------------
// Atualizar modelo de mensagem
// ------------------------------------------------------------
export async function atualizarModeloMensagem(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const canal = String(formData.get("canal") ?? "whatsapp");
  const gatilho = String(formData.get("gatilho") ?? "confirmacao");
  const referencia = String(formData.get("referencia") ?? "checkin");
  const offsetDias = Number(formData.get("offset_dias") ?? 0);
  const horaEnvio = String(formData.get("hora_envio") ?? "09:00");
  const textoTemplate = String(formData.get("texto_template") ?? "").trim();
  const ehTemplate = Boolean(formData.get("eh_template"));
  const nomeTemplate = String(formData.get("nome_template") ?? "").trim() || null;
  const ativo = Boolean(formData.get("ativo"));

  if (!id) return { ok: false, erro: "Modelo inválido." };
  if (!nome) return { ok: false, erro: "Informe um nome para o modelo." };
  if (!textoTemplate) return { ok: false, erro: "Informe o texto da mensagem." };

  try {
    await query(
      `update modelos_mensagem
         set nome=$2,
             canal=$3,
             gatilho=$4,
             referencia=$5,
             offset_dias=$6,
             hora_envio=$7,
             texto_template=$8,
             eh_template=$9,
             nome_template=$10,
             ativo=$11
       where id = $1`,
      [id, nome, canal, gatilho, referencia, offsetDias, horaEnvio, textoTemplate, ehTemplate, nomeTemplate, ativo]
    );
  } catch (e: any) {
    return { ok: false, erro: "Erro ao atualizar modelo: " + (e?.message ?? e) };
  }

  revalidatePath("/mensagens");
  return { ok: true, id };
}

// ------------------------------------------------------------
// Despesas financeiras
// ------------------------------------------------------------
export async function salvarDespesa(formData: FormData) {
  const id = String(formData.get("id") ?? "") || null;
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "geral").trim();
  const valorRaw = String(formData.get("valor") ?? "").replace(/\./g, "").replace(",", ".");
  const valor = valorRaw ? Number(valorRaw) : null;
  const data = String(formData.get("data") ?? "").trim();
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!descricao) return { ok: false, erro: "Informe a descrição." };
  if (!valor || valor <= 0) return { ok: false, erro: "Informe um valor válido." };
  if (!data) return { ok: false, erro: "Informe a data." };

  try {
    if (id) {
      await query(
        `update despesas set descricao=$2, categoria=$3, valor=$4, data=$5, observacoes=$6 where id=$1`,
        [id, descricao, categoria, valor, data, observacoes]
      );
    } else {
      await query(
        `insert into despesas (descricao, categoria, valor, data, observacoes) values ($1,$2,$3,$4,$5)`,
        [descricao, categoria, valor, data, observacoes]
      );
    }
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro" };
  }
}

export async function excluirDespesa(id: string) {
  try {
    await query(`delete from despesas where id=$1`, [id]);
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro" };
  }
}

// ------------------------------------------------------------
// Salvar (criar/editar) hóspede
// ------------------------------------------------------------
export async function salvarHospede(formData: FormData) {
  const id = String(formData.get("id") ?? "") || null;
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const email = String(formData.get("email") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const preferencias = String(formData.get("preferencias") ?? "").trim() || null;
  if (!nome) return { ok: false, erro: "Informe o nome." };

  try {
    if (id) {
      await query(
        `update hospedes set nome=$2, telefone=$3, email=$4, observacoes=$5, preferencias=$6 where id=$1`,
        [id, nome, telefone, email, observacoes, preferencias]
      );
    } else {
      await query(
        `insert into hospedes (nome, telefone, email, observacoes, preferencias) values ($1,$2,$3,$4,$5)`,
        [nome, telefone, email, observacoes, preferencias]
      );
    }
    revalidatePath("/hospedes");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro" };
  }
}
