"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Calculator,
  CandlestickChart,
  Layers,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/offer-book", label: "Livro de Ofertas", icon: CandlestickChart },
  { href: "/sell", label: "Vender Ativo", icon: Wallet },
  { href: "/simulator", label: "Simulador", icon: Calculator },
  { href: "/admin", label: "Operações", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-terminal-border bg-terminal-bg/60 backdrop-blur">
      <div className="px-5 py-5 border-b border-terminal-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse-green" />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-sm tracking-[0.18em] font-semibold text-foreground">
              FIXMATCH
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Renda Fixa · Marketplace
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border-l-2 border-transparent",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-md border border-terminal-border bg-terminal-panel p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Status do Mercado
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-green" />
          <span className="text-foreground">Operacional</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
          CDI 11,15% a.a.
        </div>
      </div>
    </aside>
  );
}
