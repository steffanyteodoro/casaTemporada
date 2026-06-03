"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<"senha" | "totp">("senha");
  const [senha, setSenha] = useState("");

  function onSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSenha(String(fd.get("senha") ?? ""));
    setEtapa("totp");
  }

  function onTotp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    const codigo = String(fd.get("codigo") ?? "").replace(/\s/g, "");

    start(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha, codigo }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErro(data.erro ?? "Erro ao autenticar.");
        if (res.status === 401 && data.erro?.includes("Senha")) {
          setEtapa("senha");
        }
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.15em] text-ocean/50 font-semibold uppercase">Olímpia · SP</p>
          <h1 className="font-display text-3xl text-ocean mt-1">Casa de<br />Temporada</h1>
        </div>

        <div className="card p-8">
          {erro && (
            <div className="rounded-xl bg-[#FDC3D3] border border-coral/30 px-4 py-3 text-sm text-magenta mb-5">
              {erro}
            </div>
          )}

          {etapa === "senha" ? (
            <form onSubmit={onSenha} className="space-y-5">
              <div>
                <p className="font-display text-xl text-ink mb-1">Acesso restrito</p>
                <p className="text-sm text-ocean/60">Digite sua senha para continuar.</p>
              </div>
              <div>
                <label className="label">Senha</label>
                <input
                  name="senha"
                  type="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="input mt-1"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 text-sm">
                Continuar →
              </button>
            </form>
          ) : (
            <form onSubmit={onTotp} className="space-y-5">
              <div>
                <p className="font-display text-xl text-ink mb-1">Verificação em 2 etapas</p>
                <p className="text-sm text-ocean/60">
                  Abra o <strong>Google Authenticator</strong> e digite o código de 6 dígitos.
                </p>
              </div>
              <div>
                <label className="label">Código do Authenticator</label>
                <input
                  name="codigo"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9\s]{6,7}"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  maxLength={7}
                  className="input mt-1 text-center text-2xl tracking-[0.5em] font-semibold"
                  placeholder="000000"
                />
              </div>
              <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-sm">
                {pending ? "Verificando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => { setEtapa("senha"); setErro(null); }}
                className="w-full text-xs text-ocean/50 hover:text-ocean text-center mt-1"
              >
                ← Voltar
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-ocean/40 mt-6">
          Acesso exclusivo · Dados protegidos
        </p>
      </div>
    </div>
  );
}
