-- Horários nas reservas
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS horario_reserva time,
  ADD COLUMN IF NOT EXISTS horario_checkin time,
  ADD COLUMN IF NOT EXISTS horario_checkout time;

-- Perfis extras
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'limpeza';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cafe';

-- Eventos de integração
CREATE TABLE IF NOT EXISTS public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS integration_events_external_uidx
  ON public.integration_events(company_id, source, external_id) WHERE external_id IS NOT NULL;

GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_events_select ON public.integration_events;
CREATE POLICY integration_events_select ON public.integration_events FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

-- Sessões de reserva via WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_reservation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone text NOT NULL,
  chat_id text,
  stage text NOT NULL DEFAULT 'inicio',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message text,
  last_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, phone)
);

GRANT SELECT ON public.whatsapp_reservation_sessions TO authenticated;
GRANT ALL ON public.whatsapp_reservation_sessions TO service_role;
ALTER TABLE public.whatsapp_reservation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_sessions_select ON public.whatsapp_reservation_sessions;
CREATE POLICY wa_sessions_select ON public.whatsapp_reservation_sessions FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP TRIGGER IF EXISTS wa_sessions_updated_at ON public.whatsapp_reservation_sessions;
CREATE TRIGGER wa_sessions_updated_at BEFORE UPDATE ON public.whatsapp_reservation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();