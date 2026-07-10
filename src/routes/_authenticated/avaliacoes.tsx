import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download } from "lucide-react";
import { useFeedbacks } from "@/lib/data";
import { fmtDate, todayISO, downloadCSV } from "@/lib/format";
import { PageHeader } from "@/components/AppLayout";
import { Stars, Badge, EmptyState } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/avaliacoes")({
  component: Avaliacoes,
});

const CRITERIA = [
  { key: "nota_geral", label: "Geral" },
  { key: "nota_limpeza", label: "Limpeza" },
  { key: "nota_conforto", label: "Conforto" },
  { key: "nota_atendimento", label: "Atendimento" },
  { key: "nota_wifi", label: "Wi-Fi" },
  { key: "nota_chuveiro", label: "Chuveiro" },
] as const;

function Avaliacoes() {
  const { data: feedbacks = [] } = useFeedbacks();

  const averages = useMemo(() => {
    return CRITERIA.map((c) => {
      const vals = feedbacks.map((f) => f[c.key]).filter((v): v is number => v != null);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { ...c, avg, count: vals.length };
    });
  }, [feedbacks]);

  const recomendam = feedbacks.filter((f) => f.recomendaria);
  const nps = feedbacks.length ? Math.round((recomendam.length / feedbacks.length) * 100) : 0;

  function exportCSV() {
    downloadCSV(`avaliacoes-${todayISO()}.csv`, [
      ["Data", "Hóspede", "Quarto", "Geral", "Limpeza", "Conforto", "Atendimento", "WiFi", "Chuveiro", "Recomenda", "Comentário", "Sugestão"],
      ...feedbacks.map((f) => [
        f.created_at.slice(0, 10),
        f.hospede_nome,
        f.quarto,
        f.nota_geral,
        f.nota_limpeza,
        f.nota_conforto,
        f.nota_atendimento,
        f.nota_wifi,
        f.nota_chuveiro,
        f.recomendaria ? "sim" : "não",
        f.comentario,
        f.sugestao,
      ]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Avaliações dos hóspedes"
        subtitle="Respostas recebidas pelo QR code dos quartos e pelo formulário impresso."
        action={
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5">
            <Download className="h-4 w-4" /> CSV
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground">Recomendariam</p>
          <p className="font-serif text-2xl font-bold">{nps}%</p>
          <p className="text-[11px] text-muted-foreground">{feedbacks.length} respostas</p>
        </div>
        {averages.map((a) => (
          <div key={a.key} className="stat-card">
            <p className="text-xs uppercase text-muted-foreground">{a.label}</p>
            <p className="font-serif text-2xl font-bold">{a.avg ? a.avg.toFixed(1) : "—"}</p>
            <Stars value={a.avg} />
          </div>
        ))}
      </div>

      {feedbacks.length === 0 ? (
        <EmptyState text="Nenhuma avaliação recebida ainda. Divulgue o QR code nos quartos!" />
      ) : (
        <div className="space-y-3">
          {feedbacks.map((f) => (
            <div key={f.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{f.hospede_nome ?? "Anônimo"}</span>
                  {f.quarto && <Badge tone="slate">Quarto {f.quarto}</Badge>}
                  <Stars value={f.nota_geral} />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {f.recomendaria != null && (
                    <Badge tone={f.recomendaria ? "sage" : "brick"}>
                      {f.recomendaria ? "Recomenda" : "Não recomenda"}
                    </Badge>
                  )}
                  {fmtDate(f.created_at)}
                </div>
              </div>
              {f.wifi_problema && (
                <p className="mt-2 text-xs text-brick">
                  ⚠ Relatou problema de Wi-Fi{f.wifi_dispositivo ? ` (aparelho: ${f.wifi_dispositivo})` : ""}
                </p>
              )}
              {f.comentario && <p className="mt-2 text-sm">{f.comentario}</p>}
              {f.sugestao && (
                <p className="mt-2 rounded-lg bg-sage-bg/50 px-3 py-2 text-sm text-pine-dark">
                  💡 Sugestão: {f.sugestao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
