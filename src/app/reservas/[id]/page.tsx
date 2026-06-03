import Link from "next/link";
import { queryOne } from "@/lib/db";
import { EditReservaForm } from "./EditReservaForm";

export const dynamic = "force-dynamic";

export default async function EditReservaPage({ params }: { params: { id: string } }) {
  const reserva = await queryOne<any>(
    `select r.*, h.nome as hospede_nome, h.telefone as hospede_telefone, h.email as hospede_email
       from reservas r
       left join hospedes h on h.id = r.hospede_id
      where r.id = $1`,
    [params.id]
  );

  if (!reserva) {
    return (
      <div className="card p-6">
        <p className="text-sm text-ocean/60">Reserva não encontrada.</p>
        <Link href="/reservas" className="btn-ghost mt-4 inline-block px-4 py-2 text-sm">
          Voltar para reservas
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Editar reserva</p>
          <h2 className="font-display text-3xl text-ink">Reserva</h2>
        </div>
        <Link href="/reservas" className="btn-ghost px-4 py-2 text-sm">
          Voltar
        </Link>
      </header>
      <EditReservaForm reserva={reserva} />
    </div>
  );
}
