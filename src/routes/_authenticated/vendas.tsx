import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import {
  useRooms,
  useReservations,
  useSales,
  useInsert,
  activeReservationForRoom,
} from "@/lib/data";
import { fmtBRL, fmtDate, todayISO, downloadCSV } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { PageHeader } from "@/components/AppLayout";
import { Modal, Field, EmptyState } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/vendas")({
  component: Vendas,
});

function Vendas() {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: sales = [] } = useSales();
  const insert = useInsert("sales", ["sales"]);
  const [open, setOpen] = useState(false);

  const today = todayISO();
  const totalHoje = sales.filter((s) => s.data === today).reduce((a, s) => a + Number(s.total), 0);
  const totalMes = sales
    .filter((s) => (s.data || "").slice(0, 7) === today.slice(0, 7))
    .reduce((a, s) => a + Number(s.total), 0);

  function exportCSV() {
    downloadCSV(`vendas-${today}.csv`, [
      ["Data", "Quarto", "Item", "Qtd", "Unitário", "Total", "Pagamento"],
      ...sales.map((s) => [s.data, s.quarto, s.item, s.qtd, s.valor_unit, s.total, s.pagamento]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Vendas extras"
        subtitle="Bebidas, lavanderia e outros consumos. Cada venda é vinculada à hospedagem ativa do quarto."
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nova venda
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground">Hoje</p>
          <p className="font-serif text-xl font-bold">{fmtBRL(totalHoje)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground">Este mês</p>
          <p className="font-serif text-xl font-bold">{fmtBRL(totalMes)}</p>
        </div>
      </div>

      {sales.length === 0 ? (
        <EmptyState text="Nenhuma venda registrada." />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Data</th>
                <th className="p-3">Quarto</th>
                <th className="p-3">Item</th>
                <th className="p-3">Qtd</th>
                <th className="p-3">Total</th>
                <th className="p-3">Pgto</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="p-3 text-muted-foreground">{fmtDate(s.data)}</td>
                  <td className="p-3 font-semibold">{s.quarto}</td>
                  <td className="p-3">{s.item}</td>
                  <td className="p-3">{s.qtd}</td>
                  <td className="p-3">{fmtBRL(s.total)}</td>
                  <td className="p-3 text-muted-foreground">{s.pagamento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <SaleForm
          rooms={rooms}
          onClose={() => setOpen(false)}
          onSave={(quarto, row) => {
            const active = activeReservationForRoom(reservations, quarto);
            insert.mutate(
              { ...row, quarto, reserva_id: active?.id ?? null },
              {
                onSuccess: () => {
                  toast.success("Venda registrada");
                  setOpen(false);
                },
                onError: (e) => toast.error(e.message),
              },
            );
          }}
        />
      )}
    </div>
  );
}

function SaleForm({
  rooms,
  onClose,
  onSave,
}: {
  rooms: ReturnType<typeof useRooms>["data"];
  onClose: () => void;
  onSave: (
    quarto: number,
    row: { item: string; qtd: number; valor_unit: number; total: number; pagamento: string; data: string },
  ) => void;
}) {
  const [quarto, setQuarto] = useState<number>(rooms?.[0]?.numero ?? 0);
  const [item, setItem] = useState("");
  const [qtd, setQtd] = useState(1);
  const [valor, setValor] = useState(0);
  const [pagamento, setPagamento] = useState<string>(PAYMENT_METHODS[0]);
  const total = qtd * valor;

  return (
    <Modal open onClose={onClose} title="Nova venda">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!item.trim()) return toast.error("Informe o item");
          onSave(quarto, { item: item.trim(), qtd, valor_unit: valor, total, pagamento, data: todayISO() });
        }}
        className="space-y-3"
      >
        <Field label="Quarto">
          <select className="field" value={quarto} onChange={(e) => setQuarto(Number(e.target.value))}>
            {rooms?.map((r) => (
              <option key={r.numero} value={r.numero}>
                {r.numero}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Item">
          <input className="field" value={item} onChange={(e) => setItem(e.target.value)} required maxLength={60} placeholder="Ex.: Refrigerante, Lavanderia" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade">
            <input type="number" min={1} className="field" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
          </Field>
          <Field label="Valor unitário">
            <input type="number" min={0} step="0.01" className="field" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Pagamento">
          <select className="field" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-serif text-lg font-bold">{fmtBRL(total)}</span>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

void useMemo;
