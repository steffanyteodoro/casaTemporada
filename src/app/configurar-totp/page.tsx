export const dynamic = "force-dynamic";

function gerarOtpauthUrl(secret: string) {
  const issuer = "Casa de Temporada";
  const account = "admin";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// Formata o secret em grupos de 4 para facilitar a leitura
function formatarSecret(s: string) {
  return s.match(/.{1,4}/g)?.join(" ") ?? s;
}

export default function ConfigurarTotp() {
  const secret = process.env.AUTH_TOTP_SECRET;

  if (!secret) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="card p-8 text-center">
          <p className="font-display text-2xl text-ink mb-3">AUTH_TOTP_SECRET não definido</p>
          <p className="text-sm text-ocean/70 mb-4">
            Adicione esta variável no Coolify → Environment Variables:
          </p>
          <div className="rounded-xl bg-ocean/8 border border-ocean/10 px-4 py-3 font-mono text-sm text-ocean break-all">
            AUTH_TOTP_SECRET=APZZMEOPN4JR7OEYAWE5
          </div>
          <p className="text-xs text-ocean/50 mt-3">
            Após salvar e fazer redeploy, volte nesta página para ver o QR code.
          </p>
        </div>
      </div>
    );
  }

  const otpauthUrl = gerarOtpauthUrl(secret);
  // Dois serviços de QR code como fallback
  const qrPrimario = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(otpauthUrl)}`;
  const qrFallback = `https://chart.googleapis.com/chart?chs=260x260&chld=M|2&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`;

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <div className="card p-8">
        <div className="text-center mb-6">
          <p className="text-xs tracking-[0.15em] text-ocean/50 font-semibold uppercase">Segurança</p>
          <h1 className="font-display text-2xl text-ink mt-1">Configurar Autenticador</h1>
          <p className="text-sm text-ocean/60 mt-2">
            Use o <strong>Google Authenticator</strong> ou <strong>Authy</strong>
          </p>
        </div>

        {/* Opção 1: QR Code */}
        <div className="rounded-xl bg-ocean/4 border border-ocean/10 p-5 mb-5">
          <p className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-ocean text-cream text-xs flex items-center justify-center font-bold">1</span>
            Escanear QR Code (mais fácil)
          </p>
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrPrimario}
              alt="QR Code"
              width={260}
              height={260}
              className="rounded-xl border border-ocean/10"
              onError={(e) => { (e.target as HTMLImageElement).src = qrFallback; }}
            />
          </div>
          <p className="text-xs text-ocean/50 text-center">
            No app → toque em <strong>+</strong> → <strong>Ler QR Code</strong>
          </p>
        </div>

        {/* Opção 2: Entrada manual */}
        <div className="rounded-xl bg-ocean/4 border border-ocean/10 p-5 mb-5">
          <p className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-ocean text-cream text-xs flex items-center justify-center font-bold">2</span>
            Ou digitar manualmente (se o QR não funcionar)
          </p>
          <ol className="text-xs text-ocean/70 space-y-1 mb-3 list-decimal list-inside">
            <li>No app toque em <strong>+</strong> → <strong>Inserir chave de configuração</strong></li>
            <li>Nome da conta: <strong>Casa de Temporada</strong></li>
            <li>Chave: cole o código abaixo</li>
            <li>Tipo: <strong>Baseado em tempo</strong></li>
          </ol>
          <div className="rounded-lg bg-white border border-ocean/10 px-3 py-2.5 font-mono text-sm text-ocean text-center tracking-widest select-all cursor-copy">
            {formatarSecret(secret)}
          </div>
          <p className="text-xs text-ocean/40 text-center mt-1">Toque para selecionar e copiar</p>
        </div>

        <div className="rounded-xl bg-sun/20 border border-sun/40 px-4 py-3 text-sm text-ink mb-6">
          ⚠️ Confirme que o código de 6 dígitos aparece no app antes de ir para o login.
        </div>

        <a href="/login" className="btn-primary w-full py-2.5 text-sm text-center block">
          Ir para o Login →
        </a>
      </div>
    </div>
  );
}
