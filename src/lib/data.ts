import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Room = Tables<"rooms">;
export type Client = Tables<"clients">;
export type Reservation = Tables<"reservations">;
export type Sale = Tables<"sales">;
export type Complaint = Tables<"complaints">;
export type Feedback = Tables<"feedbacks">;

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("numero");
      if (error) throw error;
      return data as Room[];
    },
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useReservations() {
  return useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useComplaints() {
  return useQuery({
    queryKey: ["complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Complaint[];
    },
  });
}

export function useFeedbacks() {
  return useQuery({
    queryKey: ["feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Feedback[];
    },
  });
}

// Generic table mutations
type TableName = "clients" | "reservations" | "sales" | "complaints" | "rooms" | "feedbacks";

export function useInsert<T extends TableName>(table: T, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: TablesInsert<T>) => {
      const { data, error } = await supabase.from(table).insert(row as never).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useUpdate<T extends TableName>(table: T, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string | number; patch: TablesUpdate<T> }) => {
      const key = table === "rooms" ? "numero" : "id";
      const { error } = await supabase
        .from(table)
        .update(patch as never)
        .eq(key, id as never);
      if (error) throw error;
    },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useDelete(table: TableName, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const key = table === "rooms" ? "numero" : "id";
      const { error } = await supabase.from(table).delete().eq(key, id as never);
      if (error) throw error;
    },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

// --- Derived helpers ---
export function roomStatusToday(reservations: Reservation[], numero: number, today: string): string {
  const maint = reservations.find((r) => r.quarto === numero && r.status === "manutencao");
  if (maint) return "manutencao";
  const active = reservations.filter(
    (r) => r.quarto === numero && r.status !== "cancelado" && r.status !== "finalizado",
  );
  const occ = active.find((r) => r.checkin <= today && r.checkout > today);
  if (occ) return occ.status === "ocupado" ? "ocupado" : "reservado";
  if (active.length) return "reservado";
  return "livre";
}

export function activeReservationForRoom(reservations: Reservation[], numero: number): Reservation | null {
  const active = reservations
    .filter((r) => r.quarto === numero && r.status !== "cancelado" && r.status !== "finalizado" && r.status !== "manutencao")
    .sort((a, b) => b.checkin.localeCompare(a.checkin));
  return active[0] ?? null;
}

export function hasPaidOverlap(
  reservations: Reservation[],
  numero: number,
  checkin: string,
  checkout: string,
  excludeId?: string,
): boolean {
  return reservations.some(
    (r) =>
      r.quarto === numero &&
      r.id !== excludeId &&
      r.status !== "cancelado" &&
      r.status !== "finalizado" &&
      r.status !== "manutencao" &&
      checkin < r.checkout &&
      checkout > r.checkin,
  );
}
