# FIXMATCH · Renda Fixa Secundária

Marketplace institucional para negociação secundária de títulos de renda fixa. MVP clicável construído com Next.js, TypeScript, TailwindCSS, shadcn/ui e Recharts, com tema escuro de terminal financeiro e tons verdes.

## Stack

- **Next.js 14** (App Router)
- **TypeScript** estrito
- **TailwindCSS** + custom design tokens (HSL)
- **shadcn/ui** primitives (Radix UI)
- **Recharts** para gráficos
- Dados **mockados** em arquivos locais
- Arquitetura modular com componentes reutilizáveis

## Estrutura

```
src/
├── app/                       # Rotas (App Router)
│   ├── layout.tsx             # Shell com sidebar + topbar
│   ├── page.tsx               # Dashboard
│   ├── offer-book/            # Livro de Ofertas + detalhe
│   ├── sell/                  # Fluxo do vendedor
│   ├── simulator/             # Simulador do comprador
│   └── admin/                 # Operações / backoffice
├── components/
│   ├── ui/                    # Primitives shadcn (button, card, table…)
│   ├── layout/                # Sidebar, Topbar, PageHeader
│   ├── shared/                # MetricCard, RatingPill, MatchScore…
│   ├── dashboard/             # Gráficos e listas do dashboard
│   ├── offer-book/            # Tabela com filtros, ordenação e busca
│   ├── asset-detail/          # PU compare, gráficos, intent form
│   ├── seller/                # Fluxo completo de venda
│   ├── simulator/             # Calculadora interativa
│   └── admin/                 # Esteira de operações
├── data/                      # Mock data (issuers, assets, offers, trades, admin)
├── lib/
│   ├── finance.ts             # PU, yield, deságio, match score, CDI
│   └── utils.ts               # cn() helper
└── types/                     # Tipos compartilhados
```

## Páginas

1. **Dashboard** — métricas, volume 10d, mix de ativos, melhores oportunidades, trades recentes, curva DI.
2. **Livro de Ofertas** — tabela completa com filtros (tipo, rating, urgência, taxa mínima, status), ordenação e busca.
3. **Detalhe do Ativo** — características, oferta do vendedor, comparação PU, túnel de taxas, taxas executadas, análise de deságio, notas de risco, form de intenção.
4. **Vender Ativo** — formulário com pré-análise FIXMATCH: taxa implícita, deságio, faixa sugerida, probabilidade de match.
5. **Simulador** — calculadora interativa: PU, face, vencimento, cupom, IR, retorno desejado → taxa anualizada, lucro líquido, comparação vs benchmarks (CDI, Selic, Poupança), break-even, cenários.
6. **Operações / Admin** — esteira (KYC, custódia, liquidação), alertas, pipeline de backoffice, integrações.

## Funções financeiras (lib/finance.ts)

- `computeImpliedYield(pu, face, maturity)` — taxa implícita anualizada base 252 du
- `computeAgioDeagio(currentPU, offeredPU)` — % vs preço de mercado
- `computeDiscountPct(face, pu)` — deságio sobre face
- `netReturnAfterTax(gross, taxBracket)` — retorno líquido
- `ratioVsCDI(rate)` — múltiplo do CDI
- `runBuyerSimulation(...)` — simulação completa
- `computeMatchScore(offer, profile)` — score 0–100

## Comandos

```bash
npm install
npm run dev      # dev server em http://localhost:3000
npm run build    # build de produção
npm run start    # inicia servidor de produção
```

## Roadmap (placeholders já presentes na UI)

- Custódia BTG / B3
- Preço em tempo real ANBIMA
- KYC / Onboarding
- Liquidação Cetip / B3
- Marcação a mercado

> Os dados desta versão são meramente ilustrativos. Não há integração real de brokerage, custódia ou liquidação.
