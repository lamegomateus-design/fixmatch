"use client";

import Link from "next/link";
import { Bell, Search, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CDI_ANUAL,
  IPCA_ANUAL,
  SELIC_ANUAL,
} from "@/lib/finance/constants";
import { formatPercent } from "@/lib/finance";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-terminal-border bg-terminal-bg/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 md:px-6 h-14">
        <div className="lg:hidden">
          <Link href="/" className="font-mono text-sm tracking-[0.18em] font-semibold text-foreground">
            FIXMATCH
          </Link>
        </div>
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar ativos, emissores, ISIN..."
              className="pl-8 h-9 bg-terminal-panel/60"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-md border border-terminal-border bg-terminal-panel/60 text-[11px] font-mono tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">CDI</span>
              <span className="text-primary">{formatPercent(CDI_ANUAL)}</span>
            </div>
            <span className="text-terminal-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">IPCA</span>
              <span className="text-foreground">{formatPercent(IPCA_ANUAL)}</span>
            </div>
            <span className="text-terminal-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">SELIC</span>
              <span className="text-foreground">{formatPercent(SELIC_ANUAL)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 px-1 py-0 min-w-[18px] h-[18px] text-[9px] tracking-normal"
            >
              3
            </Badge>
          </Button>
          <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-md border border-terminal-border">
            <UserCircle2 className="h-5 w-5 text-muted-foreground" />
            <div className="hidden md:block text-right leading-tight">
              <div className="text-xs font-medium">Mesa Institucional</div>
              <div className="text-[10px] text-muted-foreground">mesa@fixmatch.io</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
