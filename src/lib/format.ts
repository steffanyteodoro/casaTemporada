import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Formata "2025-06-15" -> "15/06/2025"
export function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

// Formata data + hora a partir de timestamptz ISO
export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function fmtMoeda(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Normaliza telefone para E.164 simples (DDI Brasil por padrão).
// "(17) 99999-9999" -> "+5517999999999"
export function normalizarTelefone(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const digitos = tel.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.startsWith("55")) return "+" + digitos;
  return "+55" + digitos;
}

// Número de noites entre duas datas YYYY-MM-DD
export function noites(checkin: string, checkout: string): number {
  const ms = parseISO(checkout).getTime() - parseISO(checkin).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
