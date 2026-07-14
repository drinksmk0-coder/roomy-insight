## Plano: Transformar Hotel Real em SaaS multiempresa

Escopo grande — vou dividir em fases, todas no mesmo projeto (Vite/TanStack/Supabase). Nenhuma mudança destrutiva; dados atuais migram para a empresa padrão **Hotel Real Cruzilia** vinculada ao usuário `drinksmk0@gmail.com`.

### Fase 1 — Banco (migration única)
- Novas tabelas: `companies`, `company_members` (roles: dono/recepcao/limpeza/cafe), `company_invites`, `company_integrations` (booking/airbnb/google/waha/channel_manager), `expenses`.
- Adicionar `company_id uuid` em: rooms, clients, reservations, sales, complaints, feedbacks, user_roles, e (se existirem) products, integration_events, whatsapp_reservation_sessions.
- Seed: criar empresa `Hotel Real Cruzilia` com `created_by` = id do usuário `drinksmk0@gmail.com`; UPDATE em todas as tabelas setando `company_id` = essa empresa; inserir esse usuário em `company_members` como `dono`.
- Depois de preencher, tornar `company_id` NOT NULL.
- Trocar unique global de cpf → unique `(company_id, cpf)` where cpf is not null/''.
- Rooms: unique `(company_id, numero)`; drop unique antigo em `numero`. Recriar FKs de reservations/sales/complaints/feedbacks para `(company_id, quarto)` via constraint composta.
- Função `is_company_member(_user, _company)` + `is_company_role(_user, _company, _role)` SECURITY DEFINER; refazer todas as RLS para exigir membership + role adequada (dono = tudo; recepcao = reservas/clientes/vendas/complaints/feedbacks; limpeza/cafe = leitura básica).
- Atualizar/Recriar `reservation_has_overlap(_company_id uuid, _quarto int, _checkin date, _checkout date, _exclude uuid)` .
- GRANT em cada nova tabela (authenticated + service_role).

### Fase 2 — Contexto de empresa no app
- `useCompany()` hook + `<CompanyProvider>`: busca `company_members` do usuário logado, guarda `companyId` atual em localStorage, expõe switcher.
- Atualizar `src/lib/data.ts`: todos os `useQuery` filtram por `.eq('company_id', companyId)` e todos os inserts injetam `company_id`.
- `_authenticated/route.tsx`: se usuário não tem empresa, redirect `/cadastro-empresa`; se tem 2+, mostrar seletor.

### Fase 3 — Novas telas
- `/cadastro-empresa` (público): form dados da empresa + form de quartos iniciais (repetível) + criação de user dono (signUp com email/senha) — usa server function admin para criar company + members + rooms atomicamente.
- `/empresa`: editar dados + CRUD de quartos.
- `/equipe`: convites + lista de membros com role.
- `/despesas`: CRUD + total do mês + CSV.
- `/integracoes`: canais Booking/Airbnb/Google/Channel Manager/WAHA; mostra URL de webhook `…/api/integracao-reservas?empresa=<id>&token=…`.

### Fase 4 — Sidebar + Painel + Mapa + QR + Auth
- Substituir top-nav por `Sidebar` fixa (shadcn sidebar) com itens: Painel, Mapa, Reservas, Clientes, Vendas, Despesas, Reclamações, Avaliações, QR Codes, Integrações, Empresa, Equipe.
- Painel: novos KPIs (diária média, hóspedes hoje, capacidade, despesas mês, margem mês).
- Mapa: já mostra reservas futuras; adicionar receita total (diárias + vendas) por quarto.
- `/qrcodes` e `/avaliar`: URL passa `empresa=<companyId>`; insert de feedback/complaint injeta esse company_id.
- `/auth`: limpar textos explicativos, corrigir `redirect_uri` para `window.location.origin` no Google OAuth.
- Guard anti-devtools em produção: listener para `contextmenu`, F12, Ctrl+Shift+I/J/C, Ctrl+U → `preventDefault` + toast "Acesso bloqueado". Só em `import.meta.env.PROD`.

### Fase 5 — Edge Function `integracao-reservas`
- Aceitar `?empresa=<id>` ou body `company_id`.
- Registrar `integration_events` com `company_id`.
- Buscar/criar cliente por `(company_id, cpf|telefone)`.
- Buscar quarto por `(company_id, numero)`.
- Usar `reservation_has_overlap(_company_id, …)`.
- Sessions WAHA únicas por `(company_id, phone)`.

### Fase 6 — Validação
- `bunx tsgo --noEmit` limpo.
- Build TanStack passa.
- Rotas geradas conferem.

### Detalhes técnicos
- Roles novos (`limpeza`, `cafe`) → adicionar ao enum `app_role` via `ALTER TYPE ... ADD VALUE`.
- Compat: `user_roles` legado continua existindo, mas checagens migram para `company_members` (roles legados viram membership `dono` na empresa padrão).
- Nenhum `DROP TABLE`, nenhum `DELETE`. Só `ALTER`/`UPDATE`/`INSERT`.

### Pontos de confirmação (preciso do seu OK antes de codar)
1. **Signup público** em `/cadastro-empresa` cria conta + empresa + quartos numa transação. Confirmação de email do Supabase está **desligada** no seu projeto? Se estiver ligada, o dono precisa confirmar email antes de logar — mantenho fluxo com aviso. OK?
2. Enum `app_role` hoje é `('dono','recepcao')`. Vou adicionar `limpeza` e `cafe`. OK?
3. Sidebar substitui completamente o header/topbar atual (mantenho um header fino só com switcher de empresa + user). OK?
4. Guard anti-devtools é cosmético e some com qualquer usuário técnico — só ativado em produção, com toast. Ainda quer? (recomendo manter, mas avisando que **não é segurança real** — a segurança está em RLS).

Confirma esses 4 pontos que eu já mando a migration + código.
