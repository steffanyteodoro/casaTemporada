import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeIcal(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(req: Request) {
  const secret = process.env.AIRBNB_BLOCK_ICAL_SECRET || process.env.NEXT_PUBLIC_AIRBNB_BLOCK_ICAL_SECRET;
  const token = new URL(req.url).searchParams.get("token");
  if (secret && token !== secret) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }

  const reservas = await query<any>(
    `select r.*, h.nome as hospede_nome, h.telefone as hospede_telefone, h.email as hospede_email
       from reservas r
       left join hospedes h on h.id = r.hospede_id
      where r.status_reserva <> 'cancelada'
        and r.origem <> 'airbnb'
      order by r.data_checkin`
  );

  const now = new Date();
  const dtstamp = formatDate(now) + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";

  const events = reservas.map((reserva: any) => {
    const isFaxina =
      reserva.origem === "bloqueio" &&
      Math.round(
        (new Date(reserva.data_checkout + "T00:00:00").getTime() -
          new Date(reserva.data_checkin + "T00:00:00").getTime()) /
          86400000
      ) === 1;

    const summary = isFaxina
      ? "Faxina / Limpeza"
      : reserva.origem === "bloqueio"
      ? "Bloqueio"
      : `Reserva — ${reserva.hospede_nome ?? "Sem hóspede"}`;

    const tipoLabel = isFaxina ? "Faxina" : reserva.origem === "bloqueio" ? "Bloqueio" : "Manual";
    const description = escapeIcal(
      `Tipo: ${tipoLabel}\n` +
      `Hóspede: ${reserva.hospede_nome ?? "-"}\n` +
      `Telefone: ${reserva.hospede_telefone ?? "-"}\n` +
      `Email: ${reserva.hospede_email ?? "-"}\n` +
      `Observações: ${reserva.observacoes ?? "-"}`
    );
    return [
      "BEGIN:VEVENT",
      `UID:airbnb-block-${reserva.id}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatDate(new Date(reserva.data_checkin))}`,
      `DTEND;VALUE=DATE:${formatDate(new Date(reserva.data_checkout))}`,
      `SUMMARY:${escapeIcal(summary)}`,
      `DESCRIPTION:${description}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n");
  });

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Casa de Temporada//Airbnb Block Calendar//PT-BR",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=airbnb-blocks.ics",
    },
  });
}
