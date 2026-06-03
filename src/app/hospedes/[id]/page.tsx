import { notFound } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { fmtData, fmtMoeda, noites } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { EditHospedeForm } from "./EditHospedeForm";

export const dynamic = "force-dynamic";

export default async function FichaHospede({ params }: { params: { id: string } }) {
  const hospede = await queryOne<any>(
    `select h.*,
            (select count(*) from reservas r where r.hospede_id = h.id and r.status_reserva <> 'cancelada')::int as estadias
       from hospedes h where h.id = $1`,
    [params.id]
  );

  if (!hospede) notFound();

  const reservas = await query<any>(
    `select r.* from reservas r
      where r.hospede_id = $1
      order by r.data_checkin desc limit 20`,
    [params.id]
  );

  const recorrente = (hospede.estadias ?? 0) >= 2 || hospede.eh_recorrente;

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Hóspedes</p>
          <h2 className="font-display text-3xl text-ink flex items-center gap-3">
            {hospede.nome}
            {recorrente && (
              <span className="badge text-sm" style={{ background: "#F4D35E", color: "#083D77" }}>
                ★ Recorrente
              </span>
            )}
          </h2>
          <p className="text-sm text-ocean/60 mt-1">
            {hospede.estadias ?? 0} estadia(s) · desde {fmtData(String(hospede.criado_em).slice(0, 10))}
          </p>
        </div>
        <Link href="/hospedes" className="btn-ghost px-4 py-2 text-sm">← Voltar</Link>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulário de edição */}
        <section>
          <h3 className="font-display text-xl text-ink mb-4">Dados do hóspede</h3>
          <EditHospedeForm hospede={hospede} />
        </section>

        {/* Histórico de reservas */}
        <section>
          <h3 className="font-display text-xl text-ink mb-4">Histórico de estadias</h3>
          {reservas.length === 0 ? (
            <div className="card p-6">
              <p className="text-sm text-ocean/60">Nenhuma reserva registrada.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-ocean/10">
                {reservas.map((r) => (
                  <li key={r.id} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-cream/60 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {fmtData(r.data_checkin)} → {fmtData(r.data_checkout)}
                        <span className="text-ocean/50 font-normal ml-1.5">
                          · {noites(r.data_checkin, r.data_checkout)} noite(s)
                        </span>
                      </p>
                      <p className="text-xs text-ocean/60 mt-0.5">
                        {fmtMoeda(r.valor)} · {r.qtd_pessoas} pessoa(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge status={r.status_pagamento} />
                      <Badge status={r.status_reserva} />
                      <Link href={`/reservas/${r.id}`} className="btn-ghost px-2.5 py-1.5 text-xs">
                        Ver
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
