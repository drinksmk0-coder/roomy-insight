import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  useRooms,
  useClients,
  useReservations,
  useSales,
  useComplaints,
  useInsert,
  useUpdate,
  roomStatusToday,
  activeReservationForRoom,
  futureReservationsForRoom,
  roomBlock,
  type Room,
} from "@/lib/data";
import { fmtBRL, fmtDate, fmtTime, todayISO } from "@/lib/format";
import { complaintLabel } from "@/lib/constants";
import { PageHeader } from "@/components/AppLayout";
import { Modal, Badge } from "@/components/ui-kit";
import { ReservaForm } from "@/components/ReservaForm";

export const Route = createFileRoute("/_authenticated/mapa")({
  component: Mapa,
});

type StatusKey = "livre" | "ocupado" | "reservado" | "limpeza" | "manutencao";

const STATUS_META: Record<StatusKey, { label: string; dot: string; accent: string }> = {
  livre: { label: "Livre", dot: "bg-emerald-400", accent: "bg-sage" },
  ocupado: { label: "Ocupado", dot: "bg-brass", accent: "bg-brass" },
  reservado: { label: "Reservado", dot: "bg-blue-400", accent: "bg-blue-400" },
  limpeza: { label: "Em limpeza", dot: "bg-orange-400", accent: "bg-orange-400" },
  manutencao: { label: "Manutenção", dot: "bg-brick", accent: "bg-brick" },
};

const LEGEND_ORDER: StatusKey[] = ["livre", "ocupado", "reservado", "limpeza", "manutencao"];

function Mapa() {
  const today = todayISO();
  const { data: rooms = [] } = useRooms();
  const { data: clients = [] } = useClients();
  const { data: reservations = [] } = useReservations();
  const { data: sales = [] } = useSales();
  const { data: complaints = [] } = useComplaints();
  const insert = useInsert("reservations", ["reservations"]);
  const updateRoom = useUpdate("rooms", ["rooms"]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [newFor, setNewFor] = useState<number | null>(null);

  const complaintsByRoom = useMemo(() => {
    const m = new Map<number, number>();
    complaints
      .filter((c) => c.status !== "resolvido")
      .forEach((c) => c.quarto != null && m.set(c.quarto, (m.get(c.quarto) ?? 0) + 1));
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
  const revenueByRoom = useMemo(() => {
    const m = new Map<number, number>();
    reservations.forEach((r) => {
      if (r.status !== "cancelado") m.set(r.quarto, (m.get(r.quarto) ?? 0) + Number(r.valor_total));
    });
    sales.forEach((s) => m.set(s.quarto, (m.get(s.quarto) ?? 0) + Number(s.total)));
    return m;
  }, [reservations, sales]);

  const totals = useMemo(() => {
    const s = { livre: 0, ocupado: 0, reservado: 0, outros: 0, receitaDia: 0, alertas: 0 };
    rooms.forEach((r) => {
      const st = roomStatusToday(reservations, r.numero, today, r.situacao) as StatusKey;
      if (st === "livre") s.livre++;
      else if (st === "ocupado") s.ocupado++;
      else if (st === "reservado") s.reservado++;
      else s.outros++;
    });
    reservations.forEach((r) => {
      if (r.status !== "cancelado" && r.checkin <= today && r.checkout >= today) {
        s.receitaDia += Number(r.valor_total) / Math.max(1, r.diarias);
      }
    });
    s.alertas = [...complaintsByRoom.values()].reduce((a, b) => a + b, 0);
    return s;
  }, [rooms, reservations, complaintsByRoom, today]);

  return (
    <div>
      <PageHeader
        title="Mapa de quartos"
        subtitle="Painel de comando em tempo real. Status, receita e reclamações de cada quarto — clique para detalhes ou nova reserva."
      />

      {/* Sticky legend bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-pine/10 bg-card/80 px-4 py-3 backdrop-blur-md">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-pine-dark">
          <span className="inline-block h-4 w-1.5 bg-brass" />
          Mapa de disponibilidade
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {LEGEND_ORDER.map((k, i) => {
            const meta = STATUS_META[k];
            return (
              <span
                key={k}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium ${
                  i === 0
                    ? "bg-pine text-primary-foreground"
                    : "border border-pine/20 bg-card text-pine-dark"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            );
          })}
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded border border-pine/20 bg-card px-2 py-1 text-[10px] font-medium text-pine-dark">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brick ring-2 ring-brick/30" />
            heat map de reclamações
          </span>
        </div>
      </div>

      <div className="space-y-8 pb-24">
        {floors.map(([andar, list]) => {
          const floorOcup = list.filter((r) => {
            const st = roomStatusToday(reservations, r.numero, today, r.situacao);
            return st === "ocupado" || st === "reservado";
          }).length;
          const pct = list.length ? Math.round((floorOcup / list.length) * 100) : 0;
          return (
            <section key={andar}>
              <div className="mb-4 flex items-baseline justify-between border-b border-pine/10 pb-1">
                <h2 className="font-serif text-xl font-bold italic text-pine-dark">{andar}º Andar</h2>
                <span className="font-sans text-[10px] uppercase tracking-tighter text-muted-foreground">
                  {list.length} quartos · {pct}% ocup.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {list.map((r) => {
                  const st = roomStatusToday(reservations, r.numero, today, r.situacao) as StatusKey;
                  const meta = STATUS_META[st];
                  const n = complaintsByRoom.get(r.numero) ?? 0;
                  const intensity = n / maxComplaints;
                  const blocked = !!roomBlock(complaints, r.numero);
                  const next = futureReservationsForRoom(reservations, r.numero, today)[0];
                  const revenue = revenueByRoom.get(r.numero) ?? 0;
                  const isFree = st === "livre";
                  const isMaint = st === "manutencao";

                  return (
                    <button
                      key={r.numero}
                      onClick={() => setSelected(r)}
                      className={`group relative overflow-hidden rounded-md p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isFree
                          ? "bg-pine-dark text-white"
                          : isMaint
                            ? "border-2 border-dashed border-brick/40 bg-card"
                            : "border border-pine/10 bg-card hover:border-brass"
                      }`}
                    >
                      {/* Heatmap badge */}
                      {n > 0 && (
                        <span
                          className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-4 ring-brick/20 animate-pulse"
                          style={{ backgroundColor: `oklch(0.56 0.14 28 / ${0.6 + intensity * 0.4})` }}
                        >
                          {n}
                        </span>
                      )}

                      {/* Top row: number + status pill */}
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span
                          className={`font-serif text-2xl font-bold ${
                            isFree ? "text-white" : isMaint ? "text-brick/60" : "text-pine-dark"
                          }`}
                        >
                          {r.numero}
                        </span>
                        {isFree ? (
                          <span className="rounded-sm border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-300">
                            Livre
                          </span>
                        ) : isMaint ? (
                          <span className="font-sans text-[10px] font-black uppercase italic text-brick">
                            Offline
                          </span>
                        ) : st === "limpeza" ? (
                          <span className="mt-1 inline-block h-2 w-2 animate-pulse rounded-full bg-orange-400" />
                        ) : (
                          <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                        )}
                      </div>

                      {/* Body */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className={isFree ? "text-white/50" : "text-muted-foreground"}>Diária</span>
                          <span className={`font-bold ${isFree ? "text-white" : "text-pine-dark"}`}>
                            {fmtBRL(r.preco)}
                          </span>
                        </div>
                        {revenue > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className={isFree ? "text-white/50" : "text-muted-foreground"}>Receita</span>
                            <span className="font-bold text-brass">{fmtBRL(revenue)}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer note */}
                      <div
                        className={`mt-2 border-t pt-2 ${
                          isFree ? "border-white/10" : "border-dashed border-pine/10"
                        }`}
                      >
                        {isMaint ? (
                          <p className="text-[9px] leading-tight text-muted-foreground">
                            <span className="block uppercase tracking-wider opacity-60">Status</span>
                            <span className="font-medium text-brick">Manutenção</span>
                          </p>
                        ) : next ? (
                          <p
                            className={`text-[9px] leading-tight ${
                              isFree ? "text-white/60" : "text-muted-foreground"
                            }`}
                          >
                            <span className="block uppercase tracking-wider opacity-70">Próxima</span>
                            <span className={`font-medium ${isFree ? "text-white" : "text-pine-dark"}`}>
                              {fmtDate(next.checkin)}
                            </span>
                          </p>
                        ) : (
                          <p
                            className={`text-[9px] uppercase tracking-wider ${
                              isFree ? "text-white/40" : "text-muted-foreground/70"
                            }`}
                          >
                            Sem próx. reserva
                          </p>
                        )}
                      </div>

                      {blocked && (
                        <span className="absolute bottom-2 right-2 text-[10px] font-bold text-brick">🔒</span>
                      )}

                      {/* Bottom accent bar */}
                      {!isFree && !isMaint && (
                        <div className={`absolute inset-x-0 bottom-0 h-1 ${meta.accent}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom command stats bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-pine-dark/60 bg-pine-dark px-4 py-3 shadow-lg md:left-auto md:right-6 md:bottom-6 md:rounded-xl md:border md:px-5">
        <div className="mx-auto flex max-w-3xl items-center justify-around gap-4">
          <Stat label="Livres" value={String(totals.livre)} tone="white" />
          <Divider />
          <Stat label="Ocupados" value={String(totals.ocupado)} tone="brass" />
          <Divider />
          <Stat label="Receita dia" value={fmtBRL(totals.receitaDia)} tone="brass" />
          <Divider />
          <Stat label="Alertas" value={String(totals.alertas).padStart(2, "0")} tone="brick" />
        </div>
      </div>

      {selected && (
        <RoomModal
          room={selected}
          onClose={() => setSelected(null)}
          reservation={activeReservationForRoom(reservations, selected.numero)}
          futureReservations={futureReservationsForRoom(reservations, selected.numero, today).filter(
            (fr) => fr.id !== activeReservationForRoom(reservations, selected.numero)?.id,
          )}
          sales={sales.filter((s) => s.quarto === selected.numero)}
          complaints={complaints.filter((c) => c.quarto === selected.numero)}
          onNew={() => {
            setNewFor(selected.numero);
            setSelected(null);
          }}
          onSituacao={(situacao) => {
            updateRoom.mutate(
              { id: selected.numero, patch: { situacao } },
              {
                onSuccess: () => {
                  toast.success(situacao ? "Situação do quarto atualizada" : "Situação removida");
                  setSelected((prev) => (prev ? { ...prev, situacao } : prev));
                },
                onError: (e) => toast.error(e.message),
              },
            );
          }}
        />
      )}

      {newFor != null && (
        <ReservaForm
          rooms={rooms}
          clients={clients}
          reservations={reservations}
          complaints={complaints}
          fixedRoom={newFor}
          onClose={() => setNewFor(null)}
          onSave={(row) =>
            insert.mutate(row as never, {
              onSuccess: () => {
                toast.success("Reserva criada");
                setNewFor(null);
              },
              onError: (e) => toast.error(e.message),
            })
          }
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "white" | "brass" | "brick" }) {
  const color = tone === "brass" ? "text-brass" : tone === "brick" ? "text-brick" : "text-white";
  return (
    <div className="text-center">
      <p className="text-[8px] font-medium uppercase tracking-wider text-white/50">{label}</p>
      <p className={`font-serif text-sm font-bold leading-none ${color}`}>{value}</p>
    </div>
  );
}

function Divider() {
  return <span className="h-6 w-px bg-white/10" />;
}

function RoomModal({
  room,
  onClose,
  reservation,
  futureReservations,
  sales,
  complaints,
  onNew,
  onSituacao,
}: {
  room: Room;
  onClose: () => void;
  reservation: ReturnType<typeof activeReservationForRoom>;
  futureReservations: ReturnType<typeof futureReservationsForRoom>;
  sales: { id: string; item: string; qtd: number; total: number; reserva_id: string | null; categoria: string | null }[];
  complaints: { id: string; categoria: string; descricao: string | null; status: string; created_at: string }[];
  onNew: () => void;
  onSituacao: (situacao: string | null) => void;
}) {
  const stayId = reservation?.id;
  const staySales = stayId ? sales.filter((s) => s.reserva_id === stayId || s.reserva_id == null) : sales;
  const salesTotal = staySales.reduce((s, v) => s + Number(v.total), 0);
  const diaria = reservation ? Number(reservation.valor_total) : 0;
  const totalHospedagem = diaria + salesTotal;

  return (
    <Modal open onClose={onClose} title={`Quarto ${room.numero} — ${room.andar}º andar`} wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSituacao(room.situacao === "limpeza" ? null : "limpeza")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${room.situacao === "limpeza" ? "bg-slate text-white" : "bg-slate-bg text-slate"}`}
          >
            {room.situacao === "limpeza" ? "✓ Em limpeza" : "Marcar limpeza"}
          </button>
          <button
            type="button"
            onClick={() => onSituacao(room.situacao === "manutencao" ? null : "manutencao")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${room.situacao === "manutencao" ? "bg-slate text-white" : "bg-slate-bg text-slate"}`}
          >
            {room.situacao === "manutencao" ? "✓ Em manutenção" : "Marcar manutenção"}
          </button>
          {room.situacao && (
            <button
              type="button"
              onClick={() => onSituacao(null)}
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              Liberar quarto
            </button>
          )}
        </div>
        <button onClick={onNew} className="btn-primary flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nova reserva neste quarto
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h4 className="mb-2 font-semibold">Hospedagem atual</h4>
          {reservation ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{reservation.cliente_nome}</p>
              <p className="text-muted-foreground">
                {fmtDate(reservation.checkin)} →{" "}
                {fmtDate(reservation.checkout)} · {reservation.diarias} diária(s)
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

          <h4 className="mb-2 mt-4 font-semibold">Próximas reservas</h4>
          {futureReservations.length ? (
            <ul className="space-y-1 text-sm">
              {futureReservations.map((fr) => (
                <li key={fr.id} className="flex items-center justify-between border-b border-border/60 py-1">
                  <span>
                    {fr.cliente_nome} · {fmtDate(fr.checkin)} {fmtTime(fr.horario_checkin)} →{" "}
                    {fmtDate(fr.checkout)} {fmtTime(fr.horario_checkout)}
                  </span>
                  <Badge tone="brass">{fr.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma reserva futura — quarto livre para novas datas.</p>
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
