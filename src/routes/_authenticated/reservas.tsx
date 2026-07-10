import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import {
  useRooms,
  useClients,
  useReservations,
  useInsert,
  useUpdate,
  hasPaidOverlap,
  type Reservation,
} from "@/lib/data";
import { fmtBRL, fmtDate, todayISO, nightsBetween, downloadCSV } from "@/lib/format";
import { PAYMENT_METHODS, RESERVATION_STATUS } from "@/lib/constants";
import { PageHeader } from "@/components/AppLayout";
import { Modal, Field, Badge, EmptyState } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/reservas")({
  component: Reservas,
});

const statusTone: Record<string, string> = {
  reservado: "brass",
  ocupado: "brick",
  finalizado: "slate",
  cancelado: "slate",
  manutencao: "slate",
};

function Reservas() {
  const { data: rooms = [] } = useRooms();
  const { data: clients = [] } = useClients();
  const { data: reservations = [] } = useReservations();
  const insert = useInsert("reservations", ["reservations"]);
  const update = useUpdate("reservations", ["reservations"]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ativas");

  const filtered = useMemo(() => {
    if (filter === "ativas")
      return reservations.filter((r) => !["finalizado", "cancelado"].includes(r.status));
    if (filter === "todas") return reservations;
    return reservations.filter((r) => r.status === filter);
  }, [reservations, filter]);

  function exportCSV() {
    const rows: (string | number | null)[][] = [
      ["Quarto", "Cliente", "Check-in", "Check-out", "Diárias", "Total", "Pagamento", "Pago", "Status"],
      ...reservations.map((r) => [
        r.quarto,
        r.cliente_nome,
        r.checkin,
        r.checkout,
        r.diarias,
        r.valor_total,
        r.pagamento,
        r.pago ? "sim" : "não",
        r.status,
      ]),
    ];
    downloadCSV(`reservas-${todayISO()}.csv`, rows);
  }

  return (
    <div>
      <PageHeader
        title="Reservas"
        subtitle="Cada quarto só aceita uma reserva ativa por período — o sistema bloqueia sobreposição."
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nova reserva
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {["ativas", "reservado", "ocupado", "finalizado", "todas"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-semibold capitalize ${filter === f ? "bg-pine text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Nenhuma reserva neste filtro." />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Quarto</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Período</th>
                <th className="p-3">Total</th>
                <th className="p-3">Pgto</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="p-3 font-serif text-lg font-bold">{r.quarto}</td>
                  <td className="p-3">{r.cliente_nome}</td>
                  <td className="p-3 text-muted-foreground">
                    {fmtDate(r.checkin)} → {fmtDate(r.checkout)}
                  </td>
                  <td className="p-3">{fmtBRL(r.valor_total)}</td>
                  <td className="p-3">
                    <Badge tone={r.pago ? "sage" : "brick"}>{r.pago ? "pago" : r.pagamento}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <RowActions reservation={r} update={update} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <ReservaForm
          rooms={rooms}
          clients={clients}
          reservations={reservations}
          onClose={() => setOpen(false)}
          onSave={(row) => {
            insert.mutate(row, {
              onSuccess: () => {
                toast.success("Reserva criada");
                setOpen(false);
              },
              onError: (e) => toast.error(e.message),
            });
          }}
        />
      )}
    </div>
  );
}

function RowActions({ reservation, update }: { reservation: Reservation; update: ReturnType<typeof useUpdate> }) {
  const done = ["finalizado", "cancelado"].includes(reservation.status);
  return (
    <div className="flex justify-end gap-1.5">
      {!reservation.pago && !done && (
        <button
          className="rounded-md bg-sage-bg px-2 py-1 text-xs font-semibold text-pine-dark"
          onClick={() => update.mutate({ id: reservation.id, patch: { pago: true } })}
        >
          Marcar pago
        </button>
      )}
      {reservation.status === "reservado" && (
        <button
          className="rounded-md bg-brick-bg px-2 py-1 text-xs font-semibold text-brick"
          onClick={() => update.mutate({ id: reservation.id, patch: { status: "ocupado" } })}
        >
          Check-in
        </button>
      )}
      {reservation.status === "ocupado" && (
        <button
          className="rounded-md bg-slate-bg px-2 py-1 text-xs font-semibold text-slate"
          onClick={() => update.mutate({ id: reservation.id, patch: { status: "finalizado" } })}
        >
          Check-out
        </button>
      )}
    </div>
  );
}

function ReservaForm({
  rooms,
  clients,
  reservations,
  onClose,
  onSave,
}: {
  rooms: ReturnType<typeof useRooms>["data"];
  clients: ReturnType<typeof useClients>["data"];
  reservations: Reservation[];
  onClose: () => void;
  onSave: (row: {
    quarto: number;
    cliente_id: string | null;
    cliente_nome: string;
    checkin: string;
    checkout: string;
    diarias: number;
    valor_diaria: number;
    valor_total: number;
    pagamento: string;
    pago: boolean;
    status: string;
  }) => void;
}) {
  const [quarto, setQuarto] = useState<number>(rooms?.[0]?.numero ?? 0);
  const [clienteId, setClienteId] = useState("");
  const [nome, setNome] = useState("");
  const [checkin, setCheckin] = useState(todayISO());
  const [checkout, setCheckout] = useState("");
  const [valorDiaria, setValorDiaria] = useState<number>(rooms?.[0]?.preco ?? 0);
  const [pagamento, setPagamento] = useState<string>(PAYMENT_METHODS[0]);
  const [pago, setPago] = useState(false);

  const nights = nightsBetween(checkin, checkout);
  const total = nights * valorDiaria;
  const overlap = quarto && checkin && checkout && hasPaidOverlap(reservations, quarto, checkin, checkout);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkout || nights <= 0) return toast.error("Informe um período válido");
    if (overlap) return toast.error("Já existe reserva ativa para este quarto no período");
    const cli = clients?.find((c) => c.id === clienteId);
    onSave({
      quarto,
      cliente_id: clienteId || null,
      cliente_nome: cli?.nome ?? nome.trim(),
      checkin,
      checkout,
      diarias: nights,
      valor_diaria: valorDiaria,
      valor_total: total,
      pagamento,
      pago,
      status: "reservado",
    });
  }

  return (
    <Modal open onClose={onClose} title="Nova reserva">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quarto">
            <select
              className="field"
              value={quarto}
              onChange={(e) => {
                const num = Number(e.target.value);
                setQuarto(num);
                const room = rooms?.find((r) => r.numero === num);
                if (room) setValorDiaria(room.preco);
              }}
            >
              {rooms?.map((r) => (
                <option key={r.numero} value={r.numero}>
                  {r.numero} — {fmtBRL(r.preco)} ({r.andar}º)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor da diária">
            <input
              type="number"
              className="field"
              value={valorDiaria}
              min={0}
              onChange={(e) => setValorDiaria(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Cliente cadastrado (opcional)">
          <select className="field" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">— digitar nome manualmente —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        {!clienteId && (
          <Field label="Nome do hóspede">
            <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in">
            <input type="date" className="field" value={checkin} onChange={(e) => setCheckin(e.target.value)} required />
          </Field>
          <Field label="Check-out">
            <input type="date" className="field" value={checkout} onChange={(e) => setCheckout(e.target.value)} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Pagamento">
            <select className="field" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-end gap-2 pb-2">
            <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
            <span className="text-sm font-semibold">Já pago</span>
          </label>
        </div>

        {overlap && (
          <p className="rounded-lg bg-brick-bg px-3 py-2 text-sm text-brick">
            ⚠ Este quarto já tem reserva ativa que se sobrepõe a este período.
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="text-sm text-muted-foreground">{nights} diária(s)</span>
          <span className="font-serif text-lg font-bold">{fmtBRL(total)}</span>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={!!overlap}>
            Salvar reserva
          </button>
        </div>
      </form>
    </Modal>
  );
}

void RESERVATION_STATUS;
