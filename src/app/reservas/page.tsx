import Link from "next/link";
import { query } from "@/lib/db";
import { fmtData, fmtMoeda, noites } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { CancelarReservaBtn } from "./CancelarReservaBtn";

export const dynamic = "force-dynamic";

function ehFaxina(r: any) {
  if (r.origem !== "bloqueio") return false;
  const ci = new Date(r.data_checkin + "T00:00:00");
  const co = new Date(r.data_checkout + "T00:00:00");
  const noites = Math.round((co.getTime() - ci.getTime()) / 86400000);
  return noites === 1;
}

export default async function Reservas({
  searchParams,
}: {
  searchParams: { q?: string; order?: string };
}) {
  const q = String(searchParams.q ?? "").trim();
  const order = searchParams.order === "desc" ? "desc" : "asc";

  const where: string[] = [];
  const params: any[] = [];
  if (q) {
    const term = `%${q.toLowerCase()}%`;
    params.push(term, term);
    where.push(`(lower(h.nome) like $${params.length - 1} or lower(r.origem) like $${params.length})`);
  }

  const reservas = await query<any>(
    `select r.*, h.nome as hospede_nome, h.telefone as hospede_telefone
       from reservas r left join hospedes h on h.id = r.hospede_id
       ${where.length ? `where ${where.join(" and ")}` : ""}
      order by r.data_checkin ${order} limit 100`,
    params
  );

  const icalSecret = process.env.NEXT_PUBLIC_AIRBNB_BLOCK_ICAL_SECRET;
  const icalUrl = icalSecret ? `/api/airbnb-ical?token=${icalSecret}` : "/api/airbnb-ical";

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="label">Operação</p>
            <h2 className="font-display text-3xl text-ink">Reservas</h2>
          </div>
          <Link href="/reservas/nova" className="btn-primary px-5 py-2.5 text-sm">+ Nova reserva</Link>
        </div>

        <form className="grid gap-3 sm:grid-cols-3" action="/reservas" method="get">
          <div>
            <label className="label">Buscar</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nome ou plataforma"
              className="input mt-1 w-full"
            />
          </div>
          <div>
            <label className="label">Ordenar</label>
            <select name="order" defaultValue={order} className="select mt-1 w-full">
              <option value="asc">Mais antigas primeiro</option>
              <option value="desc">Mais recentes primeiro</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary px-4 py-2 text-sm w-full">
              Aplicar
            </button>
            <Link href="/reservas" className="btn-ghost px-4 py-2 text-sm w-full text-center">
              Limpar
            </Link>
          </div>
        </form>

        <div className="rounded-xl border border-ocean/10 bg-cream px-4 py-3 text-sm text-ocean/70">
          <p className="font-medium text-ink">Feed iCal para bloquear reservas no Airbnb</p>
          {icalSecret ? (
            <p className="break-all">Use esta URL no Airbnb como calendário de bloqueio: <Link href={icalUrl} className="text-ocean underline">{icalUrl}</Link></p>
          ) : (
            <p>Defina <code className="rounded bg-[#f3f0e0] px-1.5 py-0.5">NEXT_PUBLIC_AIRBNB_BLOCK_ICAL_SECRET</code> no seu .env para ativar.</p>
          )}
        </div>
      </header>

      <div className="card overflow-hidden">
        {reservas.length === 0 ? (
          <p className="p-8 text-center text-sm text-ocean/60">
            Nenhuma reserva cadastrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ocean/60 border-b border-ocean/10">
                  <th className="px-5 py-3 font-semibold">Hóspede</th>
                  <th className="px-5 py-3 font-semibold">Período</th>
                  <th className="px-5 py-3 font-semibold">Noites</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold">Pgto</th>
                  <th className="px-5 py-3 font-semibold">Reserva</th>
                  <th className="px-5 py-3 font-semibold">Origem</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id} className="border-b border-ocean/10 last:border-0 hover:bg-cream/80">
                    <td className="px-5 py-3 font-medium text-ink">{r.hospede_nome ?? "—"}</td>
                    <td className="px-5 py-3 text-ink/80">
                      {fmtData(r.data_checkin)} → {fmtData(r.data_checkout)}
                    </td>
                    <td className="px-5 py-3 text-ink/70">{noites(r.data_checkin, r.data_checkout)}</td>
                    <td className="px-5 py-3 text-ink/80">{fmtMoeda(r.valor)}</td>
                    <td className="px-5 py-3"><Badge status={r.status_pagamento} /></td>
                    <td className="px-5 py-3"><Badge status={r.status_reserva} /></td>
                    <td className="px-5 py-3">
                      <Badge status={ehFaxina(r) ? "faxina" : r.origem} />
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <Link href={`/reservas/${r.id}`} className="btn-ghost px-3 py-2 text-xs">
                        Editar
                      </Link>
                      {r.status_reserva !== "cancelada" && <CancelarReservaBtn id={r.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
