import { authenticator } from "otplib";

export default function ConfigurarTotp() {
  const secret = process.env.AUTH_TOTP_SECRET;

  if (!secret) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="card p-8 text-center">
          <p className="font-display text-2xl text-ink mb-3">AUTH_TOTP_SECRET não definido</p>
          <p className="text-sm text-ocean/70">
            Gere um secret e adicione nas variáveis de ambiente do Coolify:
          </p>
          <div className="mt-4 rounded-xl bg-ocean/8 border border-ocean/10 px-4 py-3 font-mono text-sm text-ocean break-all">
            {authenticator.generateSecret()}
          </div>
          <p className="text-xs text-ocean/50 mt-3">
            Copie este valor, salve em AUTH_TOTP_SECRET no Coolify e faça redeploy.
          </p>
        </div>
      </div>
    );
  }

  const otpauthUrl = authenticator.keyuri(
    "admin",
    "Casa de Temporada",
    secret
  );

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`;

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <div className="card p-8">
        <h1 className="font-display text-2xl text-ink mb-2">Configurar Google Authenticator</h1>
        <p className="text-sm text-ocean/70 mb-6">
          Escaneie o QR code abaixo com o app <strong>Google Authenticator</strong> para ativar a verificação em 2 etapas.
        </p>

        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR Code Google Authenticator"
            width={220}
            height={220}
            className="rounded-xl border border-ocean/10"
          />
        </div>

        <div className="rounded-xl bg-ocean/6 border border-ocean/10 px-4 py-3 mb-6">
          <p className="text-xs font-semibold text-ocean/60 uppercase tracking-wide mb-1">
            Ou digite o código manualmente:
          </p>
          <p className="font-mono text-sm text-ink break-all tracking-widest">{secret}</p>
        </div>

        <div className="rounded-xl bg-sun/20 border border-sun/40 px-4 py-3 text-sm text-ink">
          ⚠️ <strong>Importante:</strong> Após escanear, teste o login antes de fechar esta página.
          Esta página é acessível apenas para quem já está logado.
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="btn-primary px-6 py-2.5 text-sm">
            Ir para o Painel
          </a>
        </div>
      </div>
    </div>
  );
}
