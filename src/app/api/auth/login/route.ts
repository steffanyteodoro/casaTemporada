import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHmac } from "crypto";

// Implementação TOTP (RFC 6238) sem dependência externa
function base32Decode(input: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = Buffer.alloc(Math.floor((cleaned.length * 5) / 8));
  for (const char of cleaned) {
    const idx = chars.indexOf(char);
    if (idx < 0) continue;
    value = ((value << 5) | idx) >>> 0; // força unsigned 32-bit
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
      value = value & ((1 << bits) - 1); // limpa bits já extraídos
    }
  }
  return output.slice(0, index);
}

function totpCode(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / 30);
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function verificarTotp(secret: string, codigo: string): boolean {
  const agora = Date.now();
  // Aceita janela de ±1 período (30s) para compensar drift de relógio
  for (const delta of [-1, 0, 1]) {
    if (totpCode(secret, agora + delta * 30_000) === codigo) return true;
  }
  return false;
}

export async function POST(req: Request) {
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

  if (!verificarTotp(totpSecret, String(codigo).replace(/\s/g, ""))) {
    return NextResponse.json(
      { ok: false, erro: "Código do Google Authenticator inválido ou expirado." },
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
  response.cookies.set("__session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}
