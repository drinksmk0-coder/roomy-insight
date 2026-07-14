
-- =========================================================
-- SaaS multi-tenant migration
-- =========================================================

-- 1. companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE,
  email text,
  telefone text,
  whatsapp text,
  endereco text,
  cidade text,
  estado text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. company_members
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('dono','recepcao','limpeza','cafe')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- 3. company_invites
CREATE TABLE public.company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('dono','recepcao','limpeza','cafe')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceito','cancelado','expirado')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invites TO authenticated;
GRANT ALL ON public.company_invites TO service_role;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- 4. company_integrations
CREATE TABLE public.company_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('booking','airbnb','google','waha','channel_manager')),
  name text,
  status text NOT NULL DEFAULT 'inativo' CHECK (status IN ('ativo','inativo','pendente','erro')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_integrations TO authenticated;
GRANT ALL ON public.company_integrations TO service_role;
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

-- 5. expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  descricao text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT current_date,
  metodo_pagamento text,
  observacao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Add company_id to existing tables (nullable first)
-- =========================================================
ALTER TABLE public.rooms       ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.clients     ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sales       ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.complaints  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.feedbacks   ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- =========================================================
-- Seed default company + bind existing owner
-- =========================================================
INSERT INTO public.companies (nome, slug, email, cidade, estado, created_by)
VALUES ('Hotel Real Cruzilia', 'hotel-real-cruzilia', 'drinksmk0@gmail.com', 'Cruzília', 'MG',
        'fd372f8f-f68b-478a-95f1-3f56ab33e326');

INSERT INTO public.company_members (company_id, user_id, role, ativo)
SELECT id, 'fd372f8f-f68b-478a-95f1-3f56ab33e326', 'dono', true
FROM public.companies WHERE slug = 'hotel-real-cruzilia';

-- Backfill all existing rows to default company
UPDATE public.rooms        SET company_id = (SELECT id FROM public.companies WHERE slug='hotel-real-cruzilia') WHERE company_id IS NULL;
UPDATE public.clients      SET company_id = (SELECT id FROM public.companies WHERE slug='hotel-real-cruzilia') WHERE company_id IS NULL;
UPDATE public.reservations SET company_id = (SELECT id FROM public.companies WHERE slug='hotel-real-cruzilia') WHERE company_id IS NULL;
UPDATE public.sales        SET company_id = (SELECT id FROM public.companies WHERE slug='hotel-real-cruzilia') WHERE company_id IS NULL;
UPDATE public.complaints   SET company_id = (SELECT id FROM public.companies WHERE slug='hotel-real-cruzilia') WHERE company_id IS NULL;
UPDATE public.feedbacks    SET company_id = (SELECT id FROM public.companies WHERE slug='hotel-real-cruzilia') WHERE company_id IS NULL;

-- =========================================================
-- Rebuild rooms PK -> (company_id, numero) and rewire FKs
-- =========================================================
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_quarto_fkey;
ALTER TABLE public.sales        DROP CONSTRAINT IF EXISTS sales_quarto_fkey;
ALTER TABLE public.complaints   DROP CONSTRAINT IF EXISTS complaints_quarto_fkey;

ALTER TABLE public.rooms DROP CONSTRAINT rooms_pkey;
ALTER TABLE public.rooms ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.rooms ADD PRIMARY KEY (company_id, numero);

ALTER TABLE public.reservations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.sales        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.complaints   ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.clients      ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.feedbacks    ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_room_fkey
  FOREIGN KEY (company_id, quarto) REFERENCES public.rooms(company_id, numero);
ALTER TABLE public.sales
  ADD CONSTRAINT sales_room_fkey
  FOREIGN KEY (company_id, quarto) REFERENCES public.rooms(company_id, numero);
ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_room_fkey
  FOREIGN KEY (company_id, quarto) REFERENCES public.rooms(company_id, numero);

-- CPF unique per company (was global implicit)
DROP INDEX IF EXISTS clients_cpf_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_cpf_key;
CREATE UNIQUE INDEX clients_company_cpf_uidx
  ON public.clients (company_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';

-- =========================================================
-- Membership helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND ativo = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND ativo = true AND role = ANY(_roles)
  );
$$;
REVOKE ALL ON FUNCTION public.has_company_role(uuid, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, text[]) TO authenticated, service_role;

-- =========================================================
-- Rewrite RLS policies (drop existing, create tenant-aware)
-- =========================================================

-- companies: members can see; only dono can update
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), id));
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated
  USING (public.has_company_role(auth.uid(), id, ARRAY['dono']))
  WITH CHECK (public.has_company_role(auth.uid(), id, ARRAY['dono']));

-- company_members: user can see own memberships; dono manages
CREATE POLICY cm_select ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_company_role(auth.uid(), company_id, ARRAY['dono']));
CREATE POLICY cm_insert ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_company_role(auth.uid(), company_id, ARRAY['dono'])
    OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = company_members.company_id)
  );
CREATE POLICY cm_update ON public.company_members FOR UPDATE TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono']));
CREATE POLICY cm_delete ON public.company_members FOR DELETE TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono']));

-- company_invites: dono manages
CREATE POLICY inv_all ON public.company_invites FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono']));

-- company_integrations: dono manages, membros veem
CREATE POLICY integ_select ON public.company_integrations FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY integ_write ON public.company_integrations FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono']));

-- expenses: dono/recepcao
CREATE POLICY exp_select ON public.expenses FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY exp_write ON public.expenses FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']));

-- Drop old policies on existing tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname='public' AND tablename IN ('rooms','clients','reservations','sales','complaints','feedbacks')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- rooms: membros veem, dono edita
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY rooms_write ON public.rooms FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono']));

-- clients: dono/recepcao operam
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY clients_write ON public.clients FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']));

-- reservations
CREATE POLICY res_select ON public.reservations FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY res_write ON public.reservations FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']));

-- sales
CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY sales_write ON public.sales FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao','cafe']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao','cafe']));

-- complaints: membros veem/atualizam status; público insere via anon (mantido)
CREATE POLICY comp_select ON public.complaints FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY comp_write ON public.complaints FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao','limpeza']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao','limpeza']));
CREATE POLICY comp_insert_anon ON public.complaints FOR INSERT TO anon
  WITH CHECK (company_id IS NOT NULL AND quarto IS NOT NULL AND quarto BETWEEN 1 AND 9999);
GRANT INSERT ON public.complaints TO anon;

-- feedbacks: membros leem; anon insere para avaliação pública
CREATE POLICY fb_select ON public.feedbacks FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY fb_update ON public.feedbacks FOR UPDATE TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao']));
CREATE POLICY fb_delete ON public.feedbacks FOR DELETE TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono']));
CREATE POLICY fb_insert_anon ON public.feedbacks FOR INSERT TO anon
  WITH CHECK (
    company_id IS NOT NULL AND quarto IS NOT NULL AND quarto BETWEEN 1 AND 9999
    AND (nota_geral IS NULL OR nota_geral BETWEEN 1 AND 5)
  );
GRANT INSERT ON public.feedbacks TO anon;

-- =========================================================
-- Overlap check with company scope
-- =========================================================
CREATE OR REPLACE FUNCTION public.reservation_has_overlap(
  _company_id uuid, _quarto int, _checkin date, _checkout date, _exclude uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reservations
    WHERE company_id = _company_id
      AND quarto = _quarto
      AND status NOT IN ('cancelado','finalizado','manutencao')
      AND (_exclude IS NULL OR id <> _exclude)
      AND _checkin < checkout AND _checkout > checkin
  );
$$;
REVOKE ALL ON FUNCTION public.reservation_has_overlap(uuid,int,date,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservation_has_overlap(uuid,int,date,date,uuid) TO authenticated, service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER integ_updated_at    BEFORE UPDATE ON public.company_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
