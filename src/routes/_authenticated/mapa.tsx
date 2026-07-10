import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useRooms,
  useReservations,
  useSales,
  useComplaints,
  roomStatusToday,
  activeReservationForRoom,
  type Room,
} from "@/lib/data";
import { fmtBRL, fmtDate, todayISO } from "@/lib/format";
import { complaintLabel } from "@/lib/constants";
import { PageHeader } from "@/components/AppLayout";
import { Modal, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/mapa")({
  component: Mapa,
});

const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  livre: { bg: "bg-sage-bg border-sage/40 text-pine-dark", label: "Livre" },
  ocupado: { bg: "bg-brick-bg border-brick/40 text-brick", label: "Ocupado" },
  reservado: { bg: "bg-brass-bg border-brass/50 text-[oklch(0.4_0.06_74)]", label: "Reservado" },
  manutencao: { bg: "bg-slate-bg border-slate/40 text-slate", label: "Manutenção" },
};

function Mapa() {
  const today = todayISO();
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: sales = [] } = useSales();
  const { data: complaints = [] } = useComplaints();
  const [heatmap, setHeatmap] = useState(false);
  const [selected, setSelected] = useState<Room | null>(null);

  const complaintsByRoom = useMemo(() => {
    const m = new Map<number, number>();
    complaints.forEach((c) => c.quarto != null && m.set(c.quarto, (m.get(c.quarto) ?? 0) + 1));
    return m;
  }, [complaints]);

  const floors = useMemo(() => {
    const m = new Map<number, Room[]>();
    rooms.forEach((r) => {
      if (!m.has(r.andar)) m.set(r.andar, []);
      m.get(r.andar)!.push(r);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [rooms]);

  const maxComplaints = Math.max(1, ...complaintsByRoom.values());

  return (
    <div>
      <PageHeader
        title="Mapa de quartos"
        subtitle="Situação de cada quarto hoje. Ative o mapa de calor para ver onde há mais reclamações."
        action={
          <button
            onClick={() => setHeatmap((v) => !v)}
            className={heatmap ? "btn-primary" : "btn-ghost"}
          >
            {heatmap ? "Mapa de calor: ligado" : "Mapa de calor: desligado"}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_STYLE).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded ${s.bg.split(" ")[0]}`} /> {s.label}
          </span>
        ))}
      </div>

      <div className="space-y-6">
        {floors.map(([andar, list]) => (
          <div key={andar}>
            <h3 className="section-title mb-2 text-sm uppercase tracking-wide text-muted-foreground">
              {andar}º andar
            </h3>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {list.map((r) => {
                const st = roomStatusToday(reservations, r.numero, today);
                const style = STATUS_STYLE[st] ?? STATUS_STYLE.livre;
                const n = complaintsByRoom.get(r.numero) ?? 0;
                const heat = heatmap && n > 0;
                const intensity = n / maxComplaints;
                return (
                  <button
                    key={r.numero}
                    onClick={() => setSelected(r)}
                    className={`relative aspect-square rounded-lg border p-2 text-left transition hover:scale-[1.03] ${heat ? "border-brick text-brick" : style.bg}`}
                    style={heat ? { backgroundColor: `rgba(200,60,40,${0.12 + intensity * 0.5})` } : undefined}
                  >
                    <div className="font-serif text-lg font-bold">{r.numero}</div>
                    <div className="text-[10px] opacity-80">{fmtBRL(r.preco)}</div>
                    {!heatmap && <div className="mt-1 text-[10px] font-semibold">{style.label}</div>}
                    {heatmap && <div className="mt-1 text-[10px] font-semibold">{n} reclam.</div>}
                    {!heatmap && n > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick px-1 text-[9px] font-bold text-white">
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <RoomModal
          room={selected}
          onClose={() => setSelected(null)}
          reservation={activeReservationForRoom(reservations, selected.numero)}
          sales={sales.filter((s) => s.quarto === selected.numero)}
          complaints={complaints.filter((c) => c.quarto === selected.numero)}
        />
      )}
    </div>
  );
}

function RoomModal({
  room,
  onClose,
  reservation,
  sales,
  complaints,
}: {
  room: Room;
  onClose: () => void;
  reservation: ReturnType<typeof activeReservationForRoom>;
  sales: { id: string; item: string; qtd: number; total: number; reserva_id: string | null }[];
  complaints: { id: string; categoria: string; descricao: string | null; status: string; created_at: string }[];
}) {
  // Sales linked to the active stay (or unlinked sales in the room)
  const stayId = reservation?.id;
  const staySales = stayId ? sales.filter((s) => s.reserva_id === stayId || s.reserva_id == null) : sales;
  const salesTotal = staySales.reduce((s, v) => s + Number(v.total), 0);
  const diaria = reservation ? Number(reservation.valor_total) : 0;
  const totalHospedagem = diaria + salesTotal;

  return (
    <Modal open onClose={onClose} title={`Quarto ${room.numero} — ${room.andar}º andar`} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h4 className="mb-2 font-semibold">Hospedagem atual</h4>
          {reservation ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{reservation.cliente_nome}</p>
              <p className="text-muted-foreground">
                {fmtDate(reservation.checkin)} → {fmtDate(reservation.checkout)} · {reservation.diarias} diária(s)
              </p>
              <p>Diárias: {fmtBRL(reservation.valor_total)}</p>
              <p>
                Status:{" "}
                <Badge tone={reservation.pago ? "sage" : "brick"}>
                  {reservation.pago ? "Pago" : "A receber"}
                </Badge>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem reserva ativa.</p>
          )}

          <h4 className="mb-2 mt-4 font-semibold">Vendas desta estadia</h4>
          {staySales.length ? (
            <ul className="space-y-1 text-sm">
              {staySales.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-border/60 py-1">
                  <span>{s.item} ×{s.qtd}</span>
                  <span>{fmtBRL(s.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
          )}

          <div className="mt-3 rounded-lg bg-sage-bg/60 p-3">
            <div className="flex justify-between text-sm">
              <span>Diárias</span>
              <span>{fmtBRL(diaria)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Vendas</span>
              <span>{fmtBRL(salesTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-pine/20 pt-1 font-serif text-lg font-bold text-pine-dark">
              <span>Total da hospedagem</span>
              <span>{fmtBRL(totalHospedagem)}</span>
            </div>
          </div>
        </section>

        <section>
          <h4 className="mb-2 font-semibold">Histórico de reclamações</h4>
          {complaints.length ? (
            <ul className="space-y-2 text-sm">
              {complaints.map((c) => (
                <li key={c.id} className="rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{complaintLabel(c.categoria)}</span>
                    <Badge tone={c.status === "resolvido" ? "sage" : "brick"}>{c.status}</Badge>
                  </div>
                  {c.descricao && <p className="mt-1 text-muted-foreground">{c.descricao}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">{fmtDate(c.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma reclamação neste quarto. 👍</p>
          )}
        </section>
      </div>
    </Modal>
  );
}
