import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CurveProvider } from "@/lib/curve-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIXMATCH · Renda Fixa Secundária",
  description:
    "Marketplace institucional para negociação secundária de títulos de renda fixa. Compare PU, taxas implícitas, ágio/deságio e retorno estimado.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen text-foreground antialiased">
        <CurveProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar />
              <main className="flex-1 p-4 md:p-6 lg:p-8 scrollbar-thin">
                {children}
              </main>
              <footer className="border-t border-terminal-border px-4 md:px-6 py-3 text-[10px] uppercase tracking-widest text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                <div>FIXMATCH · MVP · Dados meramente ilustrativos</div>
                <div className="flex items-center gap-3 font-mono">
                  <span>Sessão: TERMINAL-01</span>
                  <span>·</span>
                  <span>v0.1.0</span>
                </div>
              </footer>
            </div>
          </div>
        </CurveProvider>
      </body>
    </html>
  );
}
