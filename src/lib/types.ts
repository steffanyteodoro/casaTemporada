// Tipos que espelham o schema do banco (db/schema.sql)

export type OrigemReserva = "airbnb" | "manual" | "bloqueio";
export type StatusPagamento = "pendente" | "parcial" | "pago";
export type StatusReserva = "confirmada" | "cancelada" | "concluida";
export type CanalMsg = "whatsapp" | "email";
export type GatilhoMsg =
  | "confirmacao"
  | "antes_checkin"
  | "dia_checkin"
  | "durante"
  | "antes_checkout"
  | "pos_checkout"
  | "reconvite";
export type StatusEnvio = "agendada" | "enviada" | "falhou" | "lida" | "cancelada";

export interface Hospede {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  documento: string | null;
  observacoes: string | null;
  preferencias: string | null;
  eh_recorrente: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Reserva {
  id: string;
  hospede_id: string | null;
  origem: OrigemReserva;
  id_externo_airbnb: string | null;
  data_checkin: string; // YYYY-MM-DD
  data_checkout: string; // YYYY-MM-DD
  qtd_pessoas: number;
  valor: number | null;
  status_pagamento: StatusPagamento;
  status_reserva: StatusReserva;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
  // join opcional
  hospedes?: Hospede | null;
}

export interface ModeloMensagem {
  id: string;
  nome: string;
  canal: CanalMsg;
  gatilho: GatilhoMsg;
  offset_dias: number;
  referencia: "checkin" | "checkout" | "criacao";
  hora_envio: string; // HH:MM
  eh_template: boolean;
  nome_template: string | null;
  texto_template: string;
  ativo: boolean;
  criado_em: string;
}

export interface Mensagem {
  id: string;
  reserva_id: string | null;
  hospede_id: string | null;
  modelo_id: string | null;
  canal: CanalMsg;
  gatilho: GatilhoMsg;
  conteudo_final: string | null;
  status: StatusEnvio;
  agendada_para: string;
  enviada_em: string | null;
  erro: string | null;
  criado_em: string;
  // joins opcionais
  hospedes?: Pick<Hospede, "nome" | "telefone"> | null;
  reservas?: Pick<Reserva, "data_checkin" | "data_checkout"> | null;
}
