import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsTable } from "@/components/admin/operations-table";
import { adminOperations } from "@/data/admin";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function AdminPage() {
  const pending = adminOperations.filter((o) => o.status === "Em análise").length;
  const approved = adminOperations.filter((o) => o.status === "Aprovado").length;
  const waiting = adminOperations.filter((o) => o.status === "Aguardando").length;
  const blocked = adminOperations.filter((o) => o.status === "Bloqueado").length;
  const completed = adminOperations.filter((o) => o.status === "Concluído").length;
  const totalOps = adminOperations.length;
  const completionRate = Math.round((completed / totalOps) * 100);

  return (
    <div className="space-y-6 max-w-[1480px] mx-auto">
      <PageHeader
        tag="Operações · Backoffice"
        title="Painel de Operações e Compliance"
        subtitle="Acompanhe a esteira de ofertas, matches, liquidações, custódia e KYC. Operação institucional FIXMATCH com camadas de compliance e auditoria."
      />

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <MetricCard
          label="Em análise"
          value={pending.toString()}
          footnote="aguardando aprovação"
          icon={<Clock className="h-4 w-4" />}
          accent="primary"
        />
        <MetricCard
          label="Aprovadas"
          value={approved.toString()}
          footnote="prontas para mercado"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Aguardando"
          value={waiting.toString()}
          footnote="liquidação / custódia"
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          label="Bloqueadas"
          value={blocked.toString()}
          footnote="compliance / KYC"
          icon={<AlertOctagon className="h-4 w-4" />}
        />
        <MetricCard
          label="Concluídas hoje"
          value={completed.toString()}
          footnote={`${completionRate}% da esteira`}
          icon={<FileCheck2 className="h-4 w-4" />}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Backoffice</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Etapas e taxas de aprovação · D-0
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Pipeline label="Submissão de oferta" value={94} count={`${totalOps} hoje`} />
            <Pipeline label="Validação KYC / AML" value={88} count="auto + manual" />
            <Pipeline label="Validação de custódia" value={76} count="BTG / B3" />
            <Pipeline label="Publicação no livro" value={92} count="aprovação mesa" />
            <Pipeline label="Matching & contraparte" value={68} count="motor + mesa" />
            <Pipeline label="Liquidação D+1" value={97} count="Cetip / B3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas Ativos</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Itens críticos da operação
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Alert
              level="critical"
              title="KYC bloqueado · Buyer-1188"
              body="Documentação societária pendente · escalado para compliance."
            />
            <Alert
              level="warning"
              title="Liquidação aguardando · CRI-KLBN26"
              body="B3 em validação · prazo D+1 expira em 4h."
            />
            <Alert
              level="warning"
              title="Custódia · NTN-B-2035"
              body="Aguardando confirmação do agente custodiante."
            />
            <Alert
              level="info"
              title="Match Score < 50 em 3 ofertas"
              body="Considere ajustar parâmetros do motor de matching."
            />
          </CardContent>
        </Card>
      </section>

      <OperationsTable items={adminOperations} />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <IntegrationCard
          title="Custódia BTG"
          icon={<Wallet className="h-4 w-4" />}
          status="sandbox"
          metric="14 ativos"
          footnote="conectividade homologada"
        />
        <IntegrationCard
          title="Cetip / B3"
          icon={<ShieldCheck className="h-4 w-4" />}
          status="produção"
          metric="liquidação D+1"
          footnote="API estável · 99,98%"
        />
        <IntegrationCard
          title="ANBIMA · Marcação"
          icon={<FileCheck2 className="h-4 w-4" />}
          status="homologação"
          metric="curva DI / IPCA"
          footnote="planejado · Q3"
        />
        <IntegrationCard
          title="KYC · Onboard"
          icon={<ShieldCheck className="h-4 w-4" />}
          status="produção"
          metric="118 partes ativas"
          footnote="risk + compliance"
        />
      </section>
    </div>
  );
}

function Pipeline({
  label,
  value,
  count,
}: {
  label: string;
  value: number;
  count: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="font-mono tabular-nums text-xs text-muted-foreground">
          {value}% · {count}
        </span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function Alert({
  level,
  title,
  body,
}: {
  level: "info" | "warning" | "critical";
  title: string;
  body: string;
}) {
  const map = {
    info: {
      border: "border-info/30 bg-info/[0.05]",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-info" />,
    },
    warning: {
      border: "border-warning/30 bg-warning/[0.05]",
      icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
    },
    critical: {
      border: "border-destructive/30 bg-destructive/[0.05]",
      icon: <AlertOctagon className="h-3.5 w-3.5 text-destructive" />,
    },
  }[level];
  return (
    <div className={`rounded-md border ${map.border} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {map.icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-5">{body}</p>
    </div>
  );
}

function IntegrationCard({
  title,
  icon,
  status,
  metric,
  footnote,
}: {
  title: string;
  icon: React.ReactNode;
  status: "produção" | "sandbox" | "homologação";
  metric: string;
  footnote: string;
}) {
  const variant: Record<typeof status, "positive" | "info" | "warning"> = {
    produção: "positive",
    sandbox: "info",
    homologação: "warning",
  };
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
              {icon}
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {metric}
              </div>
            </div>
          </div>
          <Badge variant={variant[status]}>{status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{footnote}</p>
      </CardContent>
    </Card>
  );
}
