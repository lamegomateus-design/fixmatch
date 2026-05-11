"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatPercent } from "@/lib/finance";
import type { Offer } from "@/types";

interface Props {
  offer: Offer;
}

export function BuyIntentForm({ offer }: Props) {
  const [qty, setQty] = React.useState(Math.min(50, offer.quantity));
  const [note, setNote] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const total = qty * offer.offeredPU;

  if (submitted) {
    return (
      <Card className="border-primary/40 bg-primary/[0.04]">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Intenção de compra registrada</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A mesa de operações entrará em contato em até 1 dia útil para alinhar
            preço, custódia e liquidação. Sua intenção foi enviada ao motor de matching
            com score {offer.matchScore}.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSubmitted(false)}
          >
            Enviar nova intenção
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manifestar Intenção de Compra</CardTitle>
        <div className="text-xs text-muted-foreground mt-1">
          Sua intenção é não-vinculante e será avaliada pela contraparte.
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={offer.quantity}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
            />
            <div className="text-[10px] text-muted-foreground font-mono">
              máx. {offer.quantity}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>PU de execução</Label>
            <Input
              defaultValue={offer.offeredPU.toFixed(2)}
              className="font-mono"
            />
            <div className="text-[10px] text-muted-foreground font-mono">
              pode contraproposta
            </div>
          </div>
        </div>

        <div className="rounded-md border border-terminal-border bg-terminal-bg/40 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Volume financeiro</span>
            <span className="font-mono tabular-nums text-base text-primary font-semibold">
              {formatCurrency(total, 2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa implícita</span>
            <span className="font-mono tabular-nums">
              {formatPercent(offer.offeredRate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Liquidação estimada</span>
            <span className="font-mono">D+1 · Custódia BTG</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Observações (opcional)</Label>
          <Textarea
            placeholder="Ex.: posso aumentar volume se a taxa subir 10bps..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={() => setSubmitted(true)}>
          Enviar intenção de compra
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">
          Ao enviar, você concorda com os termos de matching FIXMATCH. KYC ativo necessário.
        </p>
      </CardContent>
    </Card>
  );
}
