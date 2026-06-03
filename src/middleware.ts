import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Rotas públicas (login) e rotas de API com autenticação própria por token/secret
// (chamadas por serviços externos: scheduler do WhatsApp e Airbnb).
const PUBLIC = [
  "/login",
  "/configurar-totp",
  "/api/auth/login",
  "/api/health",
  "/api/airbnb-ical", // protegida por AIRBNB_BLOCK_ICAL_SECRET (token na URL)
  "/api/cron",        // protegida por CRON_SECRET
  "/api/sync-airbnb", // protegida por CRON_SECRET
];

async function tokenValido(token: string, secret: string): Promise<boolean> {
  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("__session")?.value;
  const secret = process.env.AUTH_SESSION_SECRET ?? "dev-secret-troque-em-producao";

  if (!token || !(await tokenValido(token, secret))) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("__session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
