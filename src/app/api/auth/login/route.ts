import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { authenticator } from "otplib";

export async function POST(req: Request) {
  const { senha, codigo } = await req.json();

  const senhaCorreta = process.env.AUTH_SENHA;
  const totpSecret = process.env.AUTH_TOTP_SECRET;
  const sessionSecret = process.env.AUTH_SESSION_SECRET ?? "dev-secret-troque-em-producao";

  if (!senhaCorreta || !totpSecret) {
    return NextResponse.json(
      { ok: false, erro: "Autenticação não configurada. Defina AUTH_SENHA e AUTH_TOTP_SECRET nas variáveis de ambiente." },
      { status: 500 }
    );
  }

  // Verifica senha
  if (senha !== senhaCorreta) {
    return NextResponse.json({ ok: false, erro: "Senha incorreta." }, { status: 401 });
  }

  // Verifica código TOTP
  const valido = authenticator.verify({ token: codigo, secret: totpSecret });
  if (!valido) {
    return NextResponse.json(
      { ok: false, erro: "Código do Google Authenticator inválido ou expirado." },
      { status: 401 }
    );
  }

  // Gera JWT de sessão (24h)
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
    maxAge: 60 * 60 * 24, // 24h
    path: "/",
  });

  return response;
}
