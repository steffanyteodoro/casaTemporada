import Link from "next/link";
import { queryOne } from "@/lib/db";
import { EditModeloForm } from "./EditModeloForm";

export const dynamic = "force-dynamic";

export default async function EditModelo({ params }: { params: { id: string } }) {
  const modelo = await queryOne<any>(
    `select * from modelos_mensagem where id = $1`,
    [params.id]
  );

  if (!modelo) {
    return (
      <div className="card p-6">
        <p className="text-sm text-ocean/60">Modelo não encontrado.</p>
        <Link href="/mensagens" className="btn-ghost mt-4 inline-block px-4 py-2 text-sm">
          Voltar para mensagens
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Editar modelo</p>
          <h2 className="font-display text-3xl text-ink">{modelo.nome}</h2>
        </div>
        <Link href="/mensagens" className="btn-ghost px-4 py-2 text-sm">
          Voltar
        </Link>
      </header>

      <EditModeloForm modelo={modelo} />
    </div>
  );
}
