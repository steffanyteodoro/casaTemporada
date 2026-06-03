"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

const links = [
  { href: "/", label: "Painel", icon: "◗" },
  { href: "/calendario", label: "Calendário", icon: "▦" },
  { href: "/reservas", label: "Reservas", icon: "✦" },
  { href: "/hospedes", label: "Hóspedes", icon: "☺" },
  { href: "/financeiro", label: "Financeiro", icon: "◈" },
  { href: "/mensagens", label: "Mensagens", icon: "✉" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  function logout() {
    start(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    });
  }

  return (
    <aside className="w-full md:w-60 md:min-h-screen shrink-0 border-b md:border-b-0 md:border-r border-ocean/15 bg-cream/95 backdrop-blur px-4 py-6">
      <div className="mb-8 px-2">
        <div className="text-[10px] tracking-[0.15em] text-ocean/50 font-semibold uppercase">
          Olímpia · SP
        </div>
        <h1 className="font-display text-2xl leading-tight text-ocean mt-1">
          Casa de<br />Temporada
        </h1>
      </div>

      <nav className="flex md:flex-col gap-1 flex-wrap">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-ocean text-cream shadow-sm"
                  : "text-ink/70 hover:bg-ocean/8 hover:text-ink"
              }`}
            >
              <span className={`w-5 text-center text-base ${active ? "text-sun" : "text-coral"}`}>
                {l.icon}
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block mt-10 px-2 space-y-3">
        <div className="rounded-xl bg-ocean/6 border border-ocean/10 px-3 py-3 text-xs text-ocean/60 leading-relaxed">
          <p className="font-semibold text-ocean/80 mb-0.5">MVP — Fase 1</p>
          Reservas manuais &amp; automação de WhatsApp
        </div>
        <button
          onClick={logout}
          disabled={pending}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-ink/50 hover:bg-ocean/8 hover:text-ink transition-all duration-150"
        >
          <span className="w-5 text-center text-base">⏻</span>
          {pending ? "Saindo..." : "Sair"}
        </button>
      </div>
    </aside>
  );
}
