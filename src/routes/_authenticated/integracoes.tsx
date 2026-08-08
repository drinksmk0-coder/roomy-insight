import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, CalendarClock, MessageCircle, Plug, Plus, ShieldAlert, Webhook } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Badge, EmptyState, Field, Modal } from "@/components/ui-kit";
import {
  useCompanyIntegrations,
  useCurrentCompany,
  useInsert,
  useIntegrationEvents,
  useUpdate,
  useWhatsappReservationSessions,
  type CompanyIntegration,
  type IntegrationEvent,
} from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/integracoes")({
  component: Integracoes,
});

const TYPES = [
  { value: "waha", label: "WhatsApp / WAHA" },
  { value: "booking", label: "Booking" },
  { value: "airbnb", label: "Airbnb" },
  { value: "google", label: "Google Hotel" },
  { value: "hotel_profi", label: "Hotel.Profi" },
  { value: "fnrh", label: "FNRH" },
  { value: "channel_manager", label: "Channel Manager" },
];

/** Reconhece o registro legado gravado como channel_manager + configuracao.provider. */
function integrationKind(item: CompanyIntegration): string {
  const provider = String((item.configuracao as Record<string, unknown> | null)?.provider ?? "").toLowerCase();
  if (item.tipo === "channel_manager" && provider === "hotel_profi") return "hotel_profi";
  return item.tipo;
}

function connectionStatus(item: CompanyIntegration | undefined): "ativo" | "aguardando" | "inativo" | null {
  if (!item) return null;
  if (item.ativo) return "ativo";
  const st = String((item.configuracao as Record<string, unknown> | null)?.connection_status ?? "");
  if (st === "awaiting_vendor_credentials") return "aguardando";
  return "inativo";
}

function statusBadge(item: CompanyIntegration) {
  const st = connectionStatus(item);
  if (st === "ativo") return <Badge tone="sage">Ativo</Badge>;
  if (st === "aguardando") return <Badge tone="brass">Aguardando credenciais</Badge>;
  return <Badge tone="slate">Configurar</Badge>;
}

function Integracoes() {
  const current = useCurrentCompany();
  const { data: events = [] } = useIntegrationEvents();
  const { data: sessions = [] } = useWhatsappReservationSessions();
  const { data: integrations = [] } = useCompanyIntegrations();
  const insert = useInsert("company_integrations", ["company_integrations"]);
  const update = useUpdate("company_integrations", ["company_integrations"]);
  const [open, setOpen] = useState(false);
  const [presetType, setPresetType] = useState<string | null>(null);
  const [editing, setEditing] = useState<CompanyIntegration | null>(null);

  const webhookUrl = useMemo(() => {
    const base = "https://xjdqjjfnpcnywrkxentv.supabase.co/functions/v1/integracao-reservas";
    return current.data ? `${base}?empresa=${current.data.id}&token=SEU_TOKEN` : base;
  }, [current.data]);

  const hotelProfi = integrations.find((i) => integrationKind(i) === "hotel_profi") ?? null;

  function openHotelProfi() {
    setEditing(hotelProfi);
    setPresetType("hotel_profi");
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Integracoes"
        subtitle="Cadastre canais externos por empresa: WhatsApp/WAHA, Booking, Airbnb, Google, Hotel.Profi e channel managers."
        action={
          <button
            onClick={() => {
              setEditing(null);
              setPresetType(null);
              setOpen(true);
            }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Canal
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <section className="card-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-pine" />
            <h3 className="font-serif text-lg font-bold">WhatsApp / WAHA</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Use este webhook no WAHA. O token fica nos secrets do backend, nao no navegador.
          </p>
          <code className="mt-3 block break-all rounded-md bg-muted p-3 text-xs">{webhookUrl}</code>
        </section>

        <section className="card-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Plug className="h-4 w-4 text-pine" />
            <h3 className="font-serif text-lg font-bold">Hotel.Profi</h3>
          </div>
          <div className="mb-2">{hotelProfi ? statusBadge(hotelProfi) : <Badge tone="slate">Nao cadastrado</Badge>}</div>
          <p className="text-sm text-muted-foreground">
            Cadastre a URL base da API, o Swagger e o ID da propriedade. Tokens e senhas ficam apenas nos secrets do
            backend.
          </p>
          <button onClick={openHotelProfi} className="btn-ghost mt-3 py-1 text-xs">
            {hotelProfi ? "Editar Hotel.Profi" : "Configurar Hotel.Profi"}
          </button>
        </section>

        <section className="card-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-pine" />
            <h3 className="font-serif text-lg font-bold">Canais cadastrados</h3>
          </div>
          <p className="font-serif text-3xl font-bold">{integrations.length}</p>
          <p className="text-sm text-muted-foreground">Booking, Airbnb, Google, Hotel.Profi, WhatsApp e outros.</p>
        </section>

        <section className="card-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-pine" />
            <h3 className="font-serif text-lg font-bold">Conversas ativas</h3>
          </div>
          <p className="font-serif text-3xl font-bold">{sessions.length}</p>
          <p className="text-sm text-muted-foreground">Atendimentos iniciados pelo WhatsApp.</p>
        </section>
      </div>

      <IntegrationHealth integrations={integrations} events={events} />

      <section className="mt-5 card-surface overflow-x-auto">
        <div className="border-b border-border p-4">
          <h3 className="font-serif text-lg font-bold">Canais da empresa</h3>
        </div>
        {integrations.length === 0 ? (
          <EmptyState text="Nenhum canal cadastrado." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Tipo</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Identificador</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="p-3">{labelType(integrationKind(item))}</td>
                  <td className="p-3 font-semibold">{item.nome}</td>
                  <td className="p-3 text-muted-foreground">{item.identificador ?? "-"}</td>
                  <td className="p-3">{statusBadge(item)}</td>
                  <td className="p-3 text-right">
                    <button
                      className="btn-ghost py-1 text-xs"
                      onClick={() => {
                        setEditing(item);
                        setPresetType(null);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-5 card-surface overflow-x-auto">
        <div className="border-b border-border p-4">
          <h3 className="font-serif text-lg font-bold">Ultimos eventos recebidos</h3>
        </div>
        {events.length === 0 ? (
          <EmptyState text="Nenhuma integracao recebida ainda." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Data</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reserva</th>
                <th className="p-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-border/50">
                  <td className="p-3">{fmtDate(event.created_at.slice(0, 10))}</td>
                  <td className="p-3">{event.source}</td>
                  <td className="p-3">
                    <Badge tone={event.status === "created" ? "sage" : event.status === "error" ? "brick" : "brass"}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{event.reservation_id ?? "-"}</td>
                  <td className="max-w-[420px] truncate p-3 text-muted-foreground">{event.error ?? eventSummary(event)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <IntegrationForm
          editing={editing}
          presetType={presetType}
          onClose={() => {
            setOpen(false);
            setEditing(null);
            setPresetType(null);
          }}
          onSave={(row) => {
            if (editing) {
              update.mutate(
                { id: editing.id, patch: row },
                {
                  onSuccess: () => {
                    toast.success("Canal atualizado");
                    setOpen(false);
                    setEditing(null);
                    setPresetType(null);
                  },
                  onError: (e) => toast.error(e.message),
                },
              );
            } else {
              insert.mutate(row, {
                onSuccess: () => {
                  toast.success("Canal cadastrado");
                  setOpen(false);
                  setPresetType(null);
                },
                onError: (e) => toast.error(e.message),
              });
            }
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Saude das integracoes ---------------- */

const HEALTH_PROVIDERS: { key: string; label: string; sources: string[] }[] = [
  { key: "booking", label: "Booking", sources: ["booking"] },
  { key: "hotel_profi", label: "Hotel.Profi", sources: ["hotel_profi", "hotelprofi", "datareform"] },
  { key: "waha", label: "WhatsApp Business", sources: ["waha", "whatsapp"] },
  { key: "fnrh", label: "FNRH", sources: ["fnrh"] },
];

function IntegrationHealth({
  integrations,
  events,
}: {
  integrations: CompanyIntegration[];
  events: IntegrationEvent[];
}) {
  const rows = HEALTH_PROVIDERS.map((p) => {
    const integration = integrations.find((i) => {
      const kind = integrationKind(i).toLowerCase();
      return p.sources.includes(kind) || kind === p.key;
    });
    const providerEvents = events.filter((e) => {
      const src = String(e.source ?? "").toLowerCase();
      return p.sources.some((s) => src.includes(s));
    });
    const last = providerEvents[0];
    const lastError = providerEvents.find((e) => e.status === "error");
    return { ...p, integration, last, lastError };
  }).filter((r) => r.integration || r.last);

  if (!rows.length) return null;

  return (
    <section className="mt-5 card-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-pine" />
        <h3 className="font-serif text-lg font-bold">Saude das integracoes</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((r) => {
          const st = connectionStatus(r.integration ?? undefined);
          const hasError = !!r.lastError;
          const awaiting = r.key === "hotel_profi" && st !== "ativo";
          return (
            <div key={r.key} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{r.label}</span>
                {hasError && st === "ativo" ? (
                  <Badge tone="brick">Com erro</Badge>
                ) : st === "ativo" ? (
                  <Badge tone="sage">Ativo</Badge>
                ) : awaiting || st === "aguardando" ? (
                  <Badge tone="brass">Aguardando credenciais</Badge>
                ) : hasError ? (
                  <Badge tone="brick">Com erro</Badge>
                ) : (
                  <Badge tone="slate">Inativo</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {r.last ? `Ultimo evento: ${fmtDate(r.last.created_at.slice(0, 10))}` : "Sem eventos registrados."}
              </p>
              {awaiting && !hasError && (
                <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                  <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-brass" />
                  Aguardando credenciais da DATAreform.
                </p>
              )}
              {r.lastError?.error && (
                <p className="mt-1 line-clamp-2 text-xs text-brick">{r.lastError.error}</p>
              )}
              {!r.lastError && r.last && (
                <p className="mt-1 text-xs text-muted-foreground">Resultado: {r.last.status}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function labelType(type: string) {
  return TYPES.find((item) => item.value === type)?.label ?? type;
}

function eventSummary(event: { payload?: unknown; source: string }) {
  const payload = event.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== "object") return "-";

  const nome = text(payload.nome ?? payload.name ?? payload.guest_name);
  const telefone = text(payload.telefone ?? payload.phone ?? payload.whatsapp);
  const checkin = text(payload.checkin ?? payload.check_in ?? payload.arrival);
  const checkout = text(payload.checkout ?? payload.check_out ?? payload.departure);
  const pessoas = text(payload.pessoas ?? payload.guests ?? payload.hospedes ?? payload.adults);

  const parts = [
    nome && `Nome: ${nome}`,
    telefone && `WhatsApp: ${telefone}`,
    checkin && checkout && `Periodo: ${checkin} a ${checkout}`,
    pessoas && `Pessoas: ${pessoas}`,
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : event.source;
}

function text(value: unknown) {
  const result = String(value ?? "").trim();
  return result || null;
}

function IntegrationForm({
  editing,
  presetType,
  onClose,
  onSave,
}: {
  editing: CompanyIntegration | null;
  presetType: string | null;
  onClose: () => void;
  onSave: (row: Record<string, unknown>) => void;
}) {
  const initialKind = editing ? integrationKind(editing) : (presetType ?? "booking");
  const cfg = (editing?.configuracao ?? {}) as Record<string, unknown>;
  const [tipo, setTipo] = useState(initialKind);
  const [nome, setNome] = useState(editing?.nome ?? (initialKind === "hotel_profi" ? "Hotel.Profi" : ""));
  const [identificador, setIdentificador] = useState(editing?.identificador ?? "");
  const [webhookUrl, setWebhookUrl] = useState(editing?.webhook_url ?? "");
  const [observacoes, setObservacoes] = useState(editing?.observacoes ?? "");
  const [ativo, setAtivo] = useState(editing?.ativo ?? false);
  // Hotel.Profi (apenas campos nao sensiveis)
  const [apiBaseUrl, setApiBaseUrl] = useState(String(cfg.api_base_url ?? ""));
  const [swaggerUrl, setSwaggerUrl] = useState(String(cfg.swagger_url ?? ""));
  const [propertyId, setPropertyId] = useState(String(cfg.property_id ?? ""));
  const [accountId, setAccountId] = useState(String(cfg.account_id ?? ""));

  const isProfi = tipo === "hotel_profi";

  return (
    <Modal open onClose={onClose} title={editing ? "Editar canal" : "Novo canal"}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const base: Record<string, unknown> = {
            nome,
            identificador: identificador || null,
            webhook_url: webhookUrl || null,
            observacoes: observacoes || null,
            ativo,
          };
          if (isProfi) {
            // Mantem o registro existente (inclusive o legado channel_manager) sem duplicar.
            onSave({
              ...base,
              tipo: editing ? editing.tipo : "hotel_profi",
              configuracao: {
                ...cfg,
                provider: "hotel_profi",
                api_base_url: apiBaseUrl || null,
                swagger_url: swaggerUrl || null,
                property_id: propertyId || null,
                account_id: accountId || null,
                connection_status: ativo ? "connected" : "awaiting_vendor_credentials",
              },
            });
          } else {
            onSave({ ...base, tipo, configuracao: cfg ?? {} });
          }
        }}
      >
        <Field label="Tipo">
          <select className="field" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!!editing}>
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Nome no painel">
          <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Booking Hotel Real" required />
        </Field>

        {isProfi ? (
          <>
            <div className="rounded-md border border-brass/40 bg-brass-bg/40 p-3 text-xs text-muted-foreground">
              Guarde aqui apenas dados nao sensiveis. Tokens de acesso, API keys, client secrets, senhas e refresh
              tokens devem ficar exclusivamente nos secrets das Edge Functions do backend.
            </div>
            <Field label="URL base da API">
              <input className="field" value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="URL do Swagger / OpenAPI">
              <input className="field" value={swaggerUrl} onChange={(e) => setSwaggerUrl(e.target.value)} placeholder="https://.../swagger.json" />
            </Field>
            <Field label="ID da propriedade / tenant">
              <input className="field" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} />
            </Field>
            <Field label="Conta / identificador no provedor (opcional)">
              <input className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="ID / conta / propriedade">
              <input className="field" value={identificador} onChange={(e) => setIdentificador(e.target.value)} />
            </Field>
            <Field label="Webhook / URL do provedor">
              <input className="field" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            </Field>
          </>
        )}

        <Field label="Observacoes">
          <input className="field" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Canal ativo
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
