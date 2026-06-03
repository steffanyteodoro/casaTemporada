import Link from "next/link";
import { query } from "@/lib/db";
import { fmtData } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Hospedes() {
  const lista = await query<any>(
    `select h.*,
            (select count(*) from reservas r
              where r.hospede_id = h.id and r.status_reserva <> 'cancelada')::int as estadias
       from hospedes h
      order by h.nome asc limit 200`
  );

  return (
    <div>
      <header className="mb-8">
        <p className="label">Relacionamento</p>
        <h2 className="font-display text-3xl text-ink">Hóspedes</h2>
        <p className="text-sm text-ocean/60 mt-1">
          Hóspedes com 2 ou mais estadias são marcados como recorrentes.
        </p>
      </header>

      <div className="card overflow-hidden">
        {lista.length === 0 ? (
          <p className="p-8 text-center text-sm text-ocean/60">
            Nenhum hóspede cadastrado. Eles são criados automaticamente ao registrar reservas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ocean/60 border-b border-ocean/10">
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">WhatsApp</th>
                  <th className="px-5 py-3 font-semibold">Estadias</th>
                  <th className="px-5 py-3 font-semibold">Desde</th>
                  <th className="px-5 py-3 font-semibold">Perfil</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((h) => {
                  const recorrente = (h.estadias ?? 0) >= 2 || h.eh_recorrente;
                  return (
                    <tr key={h.id} className="border-b border-ocean/10 last:border-0 hover:bg-cream/80">
                      <td className="px-5 py-3 font-medium text-ink">{h.nome}</td>
                      <td className="px-5 py-3 text-ink/70">{h.telefone ?? "—"}</td>
                      <td className="px-5 py-3 text-ink/70">{h.estadias ?? 0}</td>
                      <td className="px-5 py-3 text-ink/70">{fmtData(String(h.criado_em).slice(0, 10))}</td>
                      <td className="px-5 py-3">
                        {recorrente ? (
                          <span className="badge" style={{ background: "#F4D35E", color: "#083D77" }}>★ Recorrente</span>
                        ) : (
                          <span className="text-xs text-ocean/60">Novo</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/hospedes/${h.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                          Ver ficha
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
