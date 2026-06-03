import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/configurar-totp", "/api/auth/login", "/api/health"];

// Verifica JWT usando crypto.subtle nativo do Edge Runtime (sem jose)
async function tokenValido(token: string, secret: string): Promise<boolean> {
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return false;

    const [header, payload, sigB64] = partes;

    // Verifica assinatura HMAC-SHA256
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/").padEnd(
        sigB64.length + (4 - (sigB64.length % 4)) % 4, "="
      )),
      (c) => c.charCodeAt(0)
    );

    const valido = await crypto.subtle.verify(
      "HMAC",
      keyMaterial,
      sigBytes,
      enc.encode(`${header}.${payload}`)
    );

    if (!valido) return false;

    // Verifica expiração
    const dados = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (dados.exp && dados.exp < Math.floor(Date.now() / 1000)) return false;

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
