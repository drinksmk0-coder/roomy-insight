import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, PackagePlus, Plus, RefreshCcw, ShoppingCart } from "lucide-react";
import {
  useRooms,
  useReservations,
  useSales,
  useProducts,
  useInsert,
  activeReservationForRoom,
  type Product,
} from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, fmtDate, todayISO, downloadCSV } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { PageHeader } from "@/components/AppLayout";
import { Modal, Field, EmptyState, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/vendas")({ component: Vendas });

type CartItem = {
  key: string;
  produto_id: string | null;
  item: string;
  categoria: string;
  qtd: number;
  valor_unit: number;
  total: number;
};

function Vendas() {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: sales = [] } = useSales();
  const { data: products = [], refetch: refetchProducts } = useProducts();
  const insertSale = useInsert("sales", ["sales", "products"]);
  const [saleOpen, setSaleOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);

  const today = todayISO();
  const totalHoje = sales.filter((s) => s.data === today).reduce((a, s) => a + Number(s.total), 0);
  const totalMes = sales.filter((s) => (s.data || "").slice(0, 7) === today.slice(0, 7)).reduce((a, s) => a + Number(s.total), 0);
  const estoqueAtual = products.reduce((a, p) => a + Number(p.estoque_atual || 0), 0);
  const valorEstoque = products.reduce((a, p) => a + Number(p.estoque_atual || 0) * Number((p as Product & { custo_unitario?: number }).custo_unitario || 0), 0);
  const lowStock = products.filter((p) => p.ativo && p.estoque_atual <= p.estoque_minimo);

  const groupedSales = useMemo(() => {
    const map = new Map<string, typeof sales>();
    sales.forEach((sale) => {
      const lote = String((sale as typeof sale & { lote_id?: string | null }).lote_id ?? sale.id);
      map.set(lote, [...(map.get(lote) ?? []), sale]);
    });
    return [...map.entries()];
  }, [sales]);

  function exportCSV() {
    downloadCSV(`vendas-${today}.csv`, [
      ["Data", "Comprador", "Quarto", "Categoria", "Item", "Qtd", "Unitário", "Total", "Pagamento"],
      ...sales.map((s) => [
        s.data,
        (s as typeof s & { comprador_nome?: string }).comprador_nome ?? "",
        s.quarto,
        s.categoria ?? "Geral",
        s.item,
        s.qtd,
        s.valor_unit,
        s.total,
        s.pagamento,
      ]),
    ]);
  }

  async function saveBatch(input: {
    compradorTipo: "hospede" | "funcionario";
    compradorNome: string;
    quarto: number | null;
    pagamento: string;
    items: CartItem[];
  }) {
    const loteId = crypto.randomUUID();
    const active = input.quarto ? activeReservationForRoom(reservations, input.quarto) : null;
    try {
      for (const item of input.items) {
        await insertSale.mutateAsync({
          item: item.item,
          categoria: item.categoria,
          produto_id: item.produto_id,
          qtd: item.qtd,
          valor_unit: item.valor_unit,
          total: item.total,
          pagamento: input.pagamento,
          data: todayISO(),
          quarto: input.quarto ?? 0,
          reserva_id: active?.id ?? null,
          comprador_tipo: input.compradorTipo,
          comprador_nome: input.compradorNome,
          lote_id: loteId,
        } as never);
      }
      toast.success(`${input.items.length} item(ns) registrados na mesma compra`);
      setSaleOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao registrar a compra");
    }
  }

  async function inventoryAction(product: Product, mode: "entrada" | "ajuste", quantity: number, reason: string) {
    const fn = mode === "entrada" ? "restock_product" : "adjust_product_stock";
    const args = mode === "entrada"
      ? { _product_id: product.id, _quantity: quantity, _reason: reason }
      : { _product_id: product.id, _physical_stock: quantity, _reason: reason };
    const { error } = await supabase.rpc(fn as never, args as never);
    if (error) return toast.error(error.message);
    toast.success(mode === "entrada" ? "Reposição registrada" : "Estoque físico ajustado");
    setStockProduct(null);
    await refetchProducts();
  }

  return (
    <div>
      <PageHeader
        title="Vendas e estoque"
        subtitle="Registre vários itens na mesma compra para hóspedes ou funcionários e acompanhe entradas, vendas e ajustes físicos."
        action={<div className="flex gap-2"><button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5"><Download className="h-4 w-4" /> CSV</button><button onClick={() => setSaleOpen(true)} className="btn-primary flex items-center gap-1.5"><ShoppingCart className="h-4 w-4" /> Nova compra</button></div>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Vendas hoje" value={fmtBRL(totalHoje)} />
        <Stat label="Vendas no mês" value={fmtBRL(totalMes)} />
        <Stat label="Unidades em estoque" value={String(estoqueAtual)} />
        <Stat label="Valor do estoque" value={fmtBRL(valorEstoque)} />
        <Stat label="Estoque baixo" value={String(lowStock.length)} />
      </div>

      <section className="mb-5 card-surface overflow-x-auto">
        <div className="border-b border-border p-4"><h3 className="font-serif text-lg font-bold">Estoque de produtos</h3><p className="text-sm text-muted-foreground">Total recebido, saldo atual e valor financeiro do estoque.</p></div>
        {products.length === 0 ? <EmptyState text="Nenhum produto cadastrado." /> : (
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Total recebido</th><th className="p-3">Em estoque</th><th className="p-3">Mínimo</th><th className="p-3">Valor em estoque</th><th className="p-3">Ações</th></tr></thead>
            <tbody>{products.map((p) => {
              const extended = p as Product & { estoque_total_entradas?: number; custo_unitario?: number };
              return <tr key={p.id} className="border-b border-border/50"><td className="p-3 font-semibold">{p.nome}</td><td className="p-3 text-muted-foreground">{p.categoria}</td><td className="p-3">{extended.estoque_total_entradas ?? p.estoque_atual}</td><td className="p-3"><Badge tone={p.estoque_atual <= p.estoque_minimo ? "brick" : "sage"}>{p.estoque_atual}</Badge></td><td className="p-3">{p.estoque_minimo}</td><td className="p-3 font-semibold">{fmtBRL(p.estoque_atual * Number(extended.custo_unitario || 0))}</td><td className="p-3"><button className="btn-ghost flex items-center gap-1 text-xs" onClick={() => setStockProduct(p)}><PackagePlus className="h-3.5 w-3.5" /> Movimentar</button></td></tr>;
            })}</tbody>
          </table>
        )}
      </section>

      {groupedSales.length === 0 ? <EmptyState text="Nenhuma venda registrada." /> : (
        <section className="card-surface overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="p-3">Data</th><th className="p-3">Comprador</th><th className="p-3">Quarto</th><th className="p-3">Itens</th><th className="p-3">Total</th><th className="p-3">Pagamento</th></tr></thead>
            <tbody>{groupedSales.map(([lote, rows]) => {
              const first = rows[0];
              const comprador = (first as typeof first & { comprador_nome?: string; comprador_tipo?: string }).comprador_nome || first.quarto;
              return <tr key={lote} className="border-b border-border/50 align-top"><td className="p-3 text-muted-foreground">{fmtDate(first.data)}</td><td className="p-3 font-semibold">{comprador}</td><td className="p-3">{Number(first.quarto) > 0 ? first.quarto : "—"}</td><td className="p-3">{rows.map((r) => <div key={r.id}>{r.qtd}× {r.item}</div>)}</td><td className="p-3 font-semibold">{fmtBRL(rows.reduce((a, r) => a + Number(r.total), 0))}</td><td className="p-3">{first.pagamento}</td></tr>;
            })}</tbody>
          </table>
        </section>
      )}

      {saleOpen && <BatchSaleForm rooms={rooms} reservations={reservations} products={products.filter((p) => p.ativo)} onClose={() => setSaleOpen(false)} onSave={saveBatch} />}
      {stockProduct && <StockMovementModal product={stockProduct} onClose={() => setStockProduct(null)} onSave={(mode, qty, reason) => inventoryAction(stockProduct, mode, qty, reason)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="stat-card"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="font-serif text-xl font-bold">{value}</p></div>; }

function BatchSaleForm({ rooms, reservations, products, onClose, onSave }: {
  rooms: ReturnType<typeof useRooms>["data"];
  reservations: ReturnType<typeof useReservations>["data"];
  products: Product[];
  onClose: () => void;
  onSave: (input: { compradorTipo: "hospede" | "funcionario"; compradorNome: string; quarto: number | null; pagamento: string; items: CartItem[] }) => void;
}) {
  const [tipo, setTipo] = useState<"hospede" | "funcionario">("hospede");
  const [quarto, setQuarto] = useState<number>(rooms?.[0]?.numero ?? 0);
  const [funcionario, setFuncionario] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pagamento, setPagamento] = useState(PAYMENT_METHODS[0]);
  const product = products.find((p) => p.id === produtoId);
  const active = activeReservationForRoom(reservations ?? [], quarto);
  const compradorNome = tipo === "hospede" ? active?.cliente_nome ?? `Quarto ${quarto}` : funcionario.trim();
  const total = cart.reduce((a, i) => a + i.total, 0);

  function addItem() {
    if (!product) return toast.error("Selecione um produto");
    const already = cart.filter((i) => i.produto_id === product.id).reduce((a, i) => a + i.qtd, 0);
    if (already + qtd > product.estoque_atual) return toast.error("Quantidade maior que o estoque disponível");
    setCart((items) => [...items, { key: crypto.randomUUID(), produto_id: product.id, item: product.nome, categoria: product.categoria, qtd, valor_unit: Number(product.preco), total: qtd * Number(product.preco) }]);
    setProdutoId(""); setQtd(1);
  }

  return <Modal open onClose={onClose} title="Nova compra com vários itens"><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!cart.length) return toast.error("Adicione ao menos um item"); if (tipo === "funcionario" && !compradorNome) return toast.error("Informe o funcionário"); onSave({ compradorTipo: tipo, compradorNome, quarto: tipo === "hospede" ? quarto : null, pagamento, items: cart }); }}>
    <Field label="Quem está comprando?"><select className="field" value={tipo} onChange={(e) => setTipo(e.target.value as "hospede" | "funcionario")}><option value="hospede">Hóspede</option><option value="funcionario">Funcionário</option></select></Field>
    {tipo === "hospede" ? <Field label="Quarto / hóspede"><select className="field" value={quarto} onChange={(e) => setQuarto(Number(e.target.value))}>{rooms?.map((r) => { const reservation = activeReservationForRoom(reservations ?? [], r.numero); return <option key={r.numero} value={r.numero}>{r.numero} · {reservation?.cliente_nome ?? "sem hóspede ativo"}</option>; })}</select></Field> : <Field label="Nome do funcionário"><input className="field" value={funcionario} onChange={(e) => setFuncionario(e.target.value)} placeholder="Ex.: João - recepção" /></Field>}
    <div className="grid grid-cols-[1fr_90px_auto] gap-2"><select className="field" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}><option value="">Selecione um produto</option>{products.map((p) => <option key={p.id} value={p.id}>{p.nome} · estoque {p.estoque_atual}</option>)}</select><input type="number" min={1} className="field" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /><button type="button" className="btn-ghost" onClick={addItem}><Plus className="h-4 w-4" /></button></div>
    <div className="rounded-lg border border-border">{cart.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Adicione todos os produtos desta compra.</p> : cart.map((item) => <div key={item.key} className="flex items-center justify-between border-b border-border/50 p-3 text-sm"><span>{item.qtd}× {item.item}</span><div className="flex items-center gap-3"><strong>{fmtBRL(item.total)}</strong><button type="button" className="text-brick" onClick={() => setCart((items) => items.filter((i) => i.key !== item.key))}>Remover</button></div></div>)}</div>
    <Field label="Pagamento"><select className="field" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
    <div className="flex justify-between rounded-lg bg-muted p-3"><span>Total da compra</span><strong className="font-serif text-xl">{fmtBRL(total)}</strong></div>
    <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary">Salvar compra</button></div>
  </form></Modal>;
}

function StockMovementModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (mode: "entrada" | "ajuste", qty: number, reason: string) => void }) {
  const [mode, setMode] = useState<"entrada" | "ajuste">("entrada");
  const [qty, setQty] = useState(mode === "entrada" ? 1 : product.estoque_atual);
  const [reason, setReason] = useState("");
  return <Modal open onClose={onClose} title={`Movimentar estoque · ${product.nome}`}><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(mode, qty, reason); }}>
    <div className="rounded-lg bg-muted p-3 text-sm">Saldo registrado: <strong>{product.estoque_atual}</strong></div>
    <Field label="Operação"><select className="field" value={mode} onChange={(e) => { const next = e.target.value as "entrada" | "ajuste"; setMode(next); setQty(next === "entrada" ? 1 : product.estoque_atual); }}><option value="entrada">Reposição / entrada</option><option value="ajuste">Contagem física / divergência</option></select></Field>
    <Field label={mode === "entrada" ? "Quantidade adicionada" : "Quantidade física encontrada"}><input type="number" min={0} className="field" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
    <Field label="Motivo / observação"><input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === "entrada" ? "Ex.: compra do fornecedor" : "Ex.: registrado 9, contagem física 8"} required={mode === "ajuste"} /></Field>
    <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary flex items-center gap-1.5"><RefreshCcw className="h-4 w-4" /> Registrar</button></div>
  </form></Modal>;
}
