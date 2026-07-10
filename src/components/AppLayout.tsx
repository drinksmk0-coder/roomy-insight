import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRole, useProfile } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";

const TABS = [
  { to: "/painel", label: "Painel" },
  { to: "/mapa", label: "Mapa de Quartos" },
  { to: "/reservas", label: "Reservas" },
  { to: "/clientes", label: "Clientes" },
  { to: "/vendas", label: "Vendas" },
  { to: "/reclamacoes", label: "Reclamações" },
  { to: "/avaliacoes", label: "Avaliações" },
  { to: "/qrcodes", label: "QR Codes" },
];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="font-mono text-xs text-[#CFE0D5] text-right leading-tight">
      <div className="capitalize">
        {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </div>
      <div>{now.toLocaleTimeString("pt-BR")}</div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { data: role } = useRole(user);
  const { data: profile } = useProfile(user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-gradient-to-b from-pine to-pine-dark text-white shadow-lg">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brass font-serif text-lg font-bold text-pine-dark">
              PR
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-tight">Pousada Real Cruzília</h1>
              <p className="text-[11px] uppercase tracking-wider text-[#CFE0D5]">
                Painel de Operação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Clock />
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold">{profile?.nome ?? user?.email}</div>
              <div className="text-[11px] text-[#CFE0D5]">
                {role === "dono" ? "Dono · acesso total" : "Recepção"}
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sair"
              className="rounded-md bg-white/10 p-2 transition hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md bg-white/10 p-2 md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <nav
          className={`mx-auto max-w-[1280px] gap-1 px-5 ${menuOpen ? "flex flex-col pb-3" : "hidden"} md:flex md:flex-row md:flex-wrap`}
        >
          {TABS.map((t) => {
            const active = path.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                onClick={() => setMenuOpen(false)}
                className={`rounded-t-lg px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-background text-pine-dark"
                    : "bg-white/[0.08] text-[#E7EFE9] hover:bg-white/[0.16]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 py-6">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="section-title text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
