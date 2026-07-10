// Shared option lists for the whole app.

export const PAYMENT_METHODS = [
  "dinheiro",
  "pix",
  "cartão",
  "crédito",
  "débito",
  "pendente/fiado",
] as const;

export const CLIENT_TYPES = ["hóspede", "cliente fixo", "empresa"] as const;

export const RESERVATION_STATUS = [
  "reservado",
  "ocupado",
  "finalizado",
  "cancelado",
  "manutencao",
] as const;

export const COMPLAINT_CATEGORIES = [
  { value: "wifi", label: "Wi-Fi / Internet" },
  { value: "chuveiro_frio", label: "Chuveiro frio / água quente" },
  { value: "limpeza", label: "Limpeza do quarto" },
  { value: "barulho", label: "Barulho / ruído" },
  { value: "ar_ventilacao", label: "Ar-condicionado / ventilação" },
  { value: "energia", label: "Energia / iluminação" },
  { value: "cama_colchao", label: "Cama / colchão" },
  { value: "cheiro_mofo", label: "Cheiro / mofo / umidade" },
  { value: "tv", label: "TV / controle" },
  { value: "atendimento", label: "Atendimento" },
  { value: "outros", label: "Outros" },
] as const;

export function complaintLabel(v: string): string {
  return COMPLAINT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export const COMPLAINT_SEVERITY = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

export const WIFI_DEVICES = [
  "Celular Android",
  "iPhone",
  "Notebook / PC",
  "Tablet",
  "Smart TV",
  "Não sei",
] as const;
