export const dynamic = "force-dynamic";

function gerarOtpauthUrl(secret: string) {
  const account = encodeURIComponent("admin");
  const issuer = encodeURIComponent("Casa de Temporada");
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export default function ConfigurarTotp() {
  const secret = process.env.AUTH_TOTP_SECRET;

  if (!secret) {
    // Gera um secret de exemplo para o usuário copiar
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let exemplo = "";
    for (let i = 0; i < 32; i++) exemplo += chars[Math.floor(Math.random() * chars.length)];

    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="card p-8 text-center">
          <p className="font-display text-2xl text-ink mb-3">AUTH_TOTP_SECRET não definido</p>
          <p className="text-sm text-ocean/70 mb-4">
            Adicione esta variável no Coolify → Environment Variables:
          </p>
          <div className="rounded-xl bg-ocean/8 border border-ocean/10 px-4 py-3 font-mono text-sm text-ocean break-all">
            AUTH_TOTP_SECRET={exemplo}
          </div>
          <p className="text-xs text-ocean/50 mt-3">
            Após salvar e fazer redeploy, volte nesta página para ver o QR code.
          </p>
        </div>
      </div>
    );
  }

  const otpauthUrl = gerarOtpauthUrl(secret);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauthUrl)}`;

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <div className="card p-8">
        <div className="text-center mb-2">
          <p className="text-xs tracking-[0.15em] text-ocean/50 font-semibold uppercase">Segurança</p>
          <h1 className="font-display text-2xl text-ink mt-1">Configurar Autenticador</h1>
        </div>

        <p className="text-sm text-ocean/70 text-center mb-6">
          Escaneie o QR code abaixo com o <strong>Google Authenticator</strong> para ativar a verificação em 2 etapas.
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR Code Google Authenticator"
            width={240}
            height={240}
            className="rounded-2xl border-4 border-ocean/10 shadow-sm"
          />
        </div>

        {/* Secret manual */}
        <div className="rounded-xl bg-ocean/6 border border-ocean/10 px-4 py-3 mb-5">
          <p className="text-xs font-semibold text-ocean/60 uppercase tracking-wide mb-1">
            Ou insira o código manualmente no app:
          </p>
          <p className="font-mono text-sm text-ink break-all tracking-widest select-all">{secret}</p>
        </div>

        {/* Aviso */}
        <div className="rounded-xl bg-sun/20 border border-sun/40 px-4 py-3 text-sm text-ink mb-6">
          ⚠️ <strong>Importante:</strong> Escaneie agora e confirme que os códigos estão aparecendo no app antes de tentar fazer login.
        </div>

        <div className="text-center">
          <a href="/login" className="btn-primary px-8 py-2.5 text-sm">
            Ir para o Login →
          </a>
        </div>
      </div>
    </div>
  );
}
