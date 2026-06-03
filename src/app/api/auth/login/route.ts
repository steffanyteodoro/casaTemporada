import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { authenticator } from "otplib";

export const runtime = "nodejs";

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

  // Verifica código TOTP com janela de ±1 período (30s)
  authenticator.options = { window: 1 };
  const valido = authenticator.verify({
    token: String(codigo).replace(/\s/g, ""),
    secret: totpSecret,
  });

  if (!valido) {
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
  response.cookies.set("__session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}
