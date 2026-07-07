import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: {
    default: "BTPilot — Vos appels d'offres BTP, pilotés",
    template: "%s · BTPilot",
  },
  description:
    "BTPilot aide les entreprises du bâtiment à répondre aux appels d'offres publics : analyse IA des DCE, dossiers de réponse, validation dirigeant.",
  // Favicon servi depuis public/ : la route métadonnées app/icon.svg fait
  // échouer le build quand le chemin du projet contient une apostrophe.
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
