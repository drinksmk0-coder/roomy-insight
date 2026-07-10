import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { BedDouble, DollarSign, MessageSquareWarning, Star, Wifi } from "lucide-react";
import {
  useRooms,
  useReservations,
  useSales,
  useComplaints,
  useFeedbacks,
  roomStatusToday,
} from "@/lib/data";
import { fmtBRL, todayISO } from "@/lib/format";
import { complaintLabel } from "@/lib/constants";
import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/painel")({
  component: Painel,
});

function Painel() {
  const today = todayISO();
  const month = today.slice(0, 7);
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: sales = [] } = useSales();
  const { data: complaints = [] } = useComplaints();
  const { data: feedbacks = [] } = useFeedbacks();

  const statuses = rooms.map((r) => roomStatusToday(reservations, r.numero, today));
  const ocupados = statuses.filter((s) => s === "ocupado").length;
  const reservados = statuses.filter((s) => s === "reservado").length;
  const livres = statuses.filter((s) => s === "livre").length;
  const ocupacao = rooms.length ? Math.round((ocupados / rooms.length) * 100) : 0;

  const receitaMes =
    reservations
      .filter((r) => r.pago && (r.checkin || "").slice(0, 7) === month)
      .reduce((s, r) => s + Number(r.valor_total), 0) +
    sales.filter((s) => (s.data || "").slice(0, 7) === month).reduce((s, v) => s + Number(v.total), 0);

  const aReceber = reservations
    .filter((r) => !r.pago && r.status !== "cancelado")
    .reduce((s, r) => s + Number(r.valor_total), 0);

  const abertas = complaints.filter((c) => c.status !== "resolvido");
  const notas = feedbacks.map((f) => f.nota_geral).filter((n): n is number => n != null);
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;

  // Recurring problem rooms (2+ complaints same room)
  const byRoom = new Map<number, number>();
  complaints.forEach((c) => {
    if (c.quarto != null) byRoom.set(c.quarto, (byRoom.get(c.quarto) ?? 0) + 1);
  });
  const recorrentes = [...byRoom.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);

  const wifiCount = complaints.filter((c) => c.categoria === "wifi").length;

  return (
    <div>
      <PageHeader
        title="Painel de operação"
        subtitle="Visão geral de hoje e do mês, incluindo problemas recorrentes por quarto."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<BedDouble />} label="Ocupação hoje" value={`${ocupacao}%`} hint={`${ocupados} ocupados · ${reservados} reservados · ${livres} livres`} />
        <Stat icon={<DollarSign />} label="Receita do mês" value={fmtBRL(receitaMes)} hint={`A receber: ${fmtBRL(aReceber)}`} />
        <Stat icon={<MessageSquareWarning />} label="Reclamações abertas" value={String(abertas.length)} hint={`${wifiCount} sobre Wi-Fi`} />
        <Stat icon={<Star />} label="Avaliação média" value={media ? media.toFixed(1) : "—"} hint={`${feedbacks.length} avaliações`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title text-lg">Quartos com problema recorrente</h3>
            <Link to="/reclamacoes" className="text-xs font-semibold text-pine hover:underline">
              ver todas
            </Link>
          </div>
          {recorrentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum quarto com reclamações repetidas. Bom sinal! 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {recorrentes.map(([q, n]) => {
                const cats = complaints.filter((c) => c.quarto === q);
                const topCat = mostCommon(cats.map((c) => c.categoria));
                return (
                  <li key={q} className="flex items-center justify-between rounded-lg bg-brick-bg/50 px-3 py-2">
                    <div>
                      <span className="font-semibold">Quarto {q}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        principalmente: {complaintLabel(topCat)}
                      </span>
                    </div>
                    <Badge tone="brick">{n} reclamações</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Wifi className="h-5 w-5 text-pine" />
            <h3 className="section-title text-lg">Wi-Fi: quarto x aparelho</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Ajuda a saber se o problema é do quarto ou do aparelho do hóspede.
          </p>
          <WifiInsight complaints={complaints} feedbacks={feedbacks} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="stat-card">
      <div className="mb-2 flex items-center gap-2 text-pine">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="font-serif text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function WifiInsight({
  complaints,
  feedbacks,
}: {
  complaints: { categoria: string; quarto: number | null; dispositivo: string | null }[];
  feedbacks: { quarto: number | null; wifi_problema: boolean; wifi_dispositivo: string | null }[];
}) {
  const wifiComplaints = complaints.filter((c) => c.categoria === "wifi");
  const wifiFeedbacks = feedbacks.filter((f) => f.wifi_problema);

  const rooms = new Map<number, number>();
  wifiComplaints.forEach((c) => c.quarto != null && rooms.set(c.quarto, (rooms.get(c.quarto) ?? 0) + 1));
  wifiFeedbacks.forEach((f) => f.quarto != null && rooms.set(f.quarto, (rooms.get(f.quarto) ?? 0) + 1));

  const devices = new Map<string, number>();
  wifiComplaints.forEach((c) => c.dispositivo && devices.set(c.dispositivo, (devices.get(c.dispositivo) ?? 0) + 1));
  wifiFeedbacks.forEach((f) => f.wifi_dispositivo && devices.set(f.wifi_dispositivo, (devices.get(f.wifi_dispositivo) ?? 0) + 1));

  const topRooms = [...rooms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topDevices = [...devices.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  if (topRooms.length === 0 && topDevices.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem registros de Wi-Fi ainda.</p>;
  }

  const repeatingRoom = topRooms.find(([, n]) => n >= 2);

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Por quarto</p>
          {topRooms.length ? (
            topRooms.map(([q, n]) => (
              <div key={q} className="flex justify-between border-b border-border/60 py-1">
                <span>Quarto {q}</span>
                <span className="font-semibold">{n}</span>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Por aparelho</p>
          {topDevices.length ? (
            topDevices.map(([d, n]) => (
              <div key={d} className="flex justify-between border-b border-border/60 py-1">
                <span>{d}</span>
                <span className="font-semibold">{n}</span>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <p className="rounded-lg bg-sage-bg/60 px-3 py-2 text-xs text-pine-dark">
        {repeatingRoom
          ? `O quarto ${repeatingRoom[0]} repete queixas de Wi-Fi — provável problema de sinal no quarto.`
          : "As queixas estão espalhadas por vários quartos/aparelhos — provavelmente ligadas ao aparelho do hóspede, não a um quarto específico."}
      </p>
    </div>
  );
}

function mostCommon(arr: string[]): string {
  const m = new Map<string, number>();
  arr.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
