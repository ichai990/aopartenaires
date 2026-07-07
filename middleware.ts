import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Middleware = première barrière (confort de navigation).
// La sécurité autoritative vit dans lib/auth/guards.ts, appelée par chaque
// page serveur, server action et route handler.
const { auth } = NextAuth(authConfig);

const AUTH_PAGES = [
  "/connexion",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/invitation",
];

// Vitrine publique (public/home.html servie sur « / » via le rewrite
// de next.config.ts) : accessible sans connexion.
// NB : renvoyer explicitement NextResponse.next() — un retour vide laisse
// le wrapper auth() de next-auth appliquer sa redirection par défaut.
const PUBLIC_PAGES = ["/", "/home.html", "/compte-desactive"];

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;

  if (PUBLIC_PAGES.includes(nextUrl.pathname)) {
    return NextResponse.next();
  }

  const isAuthPage = AUTH_PAGES.some((p) => nextUrl.pathname.startsWith(p));

  if (isAuthPage) {
    if (user) {
      const home = user.role === "SUPER_ADMIN" ? "/admin" : "/app";
      return NextResponse.redirect(new URL(home, nextUrl));
    }
    return NextResponse.next();
  }

  if (!user) {
    const login = new URL("/connexion", nextUrl);
    return NextResponse.redirect(login);
  }

  if (nextUrl.pathname.startsWith("/admin") && user.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/app", nextUrl));
  }
  // Un super admin n'accède à /app qu'en mode « voir comme » (cookie posé
  // par l'action startImpersonation — vérifié en base par les guards).
  if (
    nextUrl.pathname.startsWith("/app") &&
    user.role === "SUPER_ADMIN" &&
    !req.cookies.has("btp-view-as")
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
