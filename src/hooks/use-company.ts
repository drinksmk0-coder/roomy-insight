import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-auth";

const KEY = "hotelreal.currentCompanyId";

export type CompanyMembership = {
  id: string;
  company_id: string;
  role: "dono" | "recepcao" | "limpeza" | "cafe";
  ativo: boolean;
  companies: { id: string; nome: string; slug: string | null } | null;
};

export function useMemberships() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CompanyMembership[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, company_id, role, ativo, companies(id, nome, slug)")
        .eq("user_id", user!.id)
        .eq("ativo", true);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any;
    },
  });
}

export function useCurrentCompanyId(): string | null {
  const { data: memberships } = useMemberships();
  const [stored, setStored] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEY);
  });
  useEffect(() => {
    if (!memberships?.length) return;
    if (!stored || !memberships.some((m) => m.company_id === stored)) {
      const id = memberships[0].company_id;
      localStorage.setItem(KEY, id);
      setStored(id);
    }
  }, [memberships, stored]);
  return stored;
}

export function setCurrentCompanyId(id: string) {
  localStorage.setItem(KEY, id);
  window.location.reload();
}

export function useCurrentRole(): CompanyMembership["role"] | null {
  const id = useCurrentCompanyId();
  const { data: memberships } = useMemberships();
  return memberships?.find((m) => m.company_id === id)?.role ?? null;
}
