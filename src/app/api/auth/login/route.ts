import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHmac } from "crypto";

export const runtime = "nodejs";

// ── TOTP (RFC 6238) com crypto nativo — sem dependências externas ──
function base32Decode(input: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    value = (value << 5) | chars.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpCode(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", key).update(buf).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin =
    ((h[off] & 0x7f) << 24) |
    ((h[off + 1] & 0xff) << 16) |
    ((h[off + 2] & 0xff) << 8) |
    (h[off + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

// Aceita janela de ±1 período (30s) para tolerar diferença de relógio
function verificarTotp(secret: string, codigo: string): boolean {
  const cod = codigo.replace(/\D/g, "");
  if (cod.length !== 6) return false;
  const counterAtual = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (totpCode(secret, counterAtual + delta) === cod) return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const { senha, codigo } = await req.json();

    const senhaCorreta = process.env.AUTH_SENHA;
    const totpSecret = process.env.AUTH_TOTP_SECRET;
    const sessionSecret = process.env.AUTH_SESSION_SECRET ?? "dev-secret-troque-em-producao";

    if (!senhaCorreta || !totpSecret) {
      return NextResponse.json(
        { ok: false, erro: "Autenticação não configurada. Defina AUTH_SENHA e AUTH_TOTP_SECRET." },
        { status: 500 }
      );
    }

    if (senha !== senhaCorreta) {
      return NextResponse.json({ ok: false, erro: "Senha incorreta." }, { status: 401 });
    }

    if (!verificarTotp(totpSecret, String(codigo ?? ""))) {
      return NextResponse.json(
        { ok: false, erro: "Código inválido ou expirado. Tente o próximo código." },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(sessionSecret);
    const token = await new SignJWT({ sub: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ ok: true });
    // secure controlado por env: false no HTTP (sslip.io), true quando houver HTTPS.
    // Defina COOKIE_SECURE=true no Coolify após configurar o domínio com SSL.
    response.cookies.set("__session", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, erro: "Erro interno ao processar o login." },
      { status: 500 }
    );
  }
}
