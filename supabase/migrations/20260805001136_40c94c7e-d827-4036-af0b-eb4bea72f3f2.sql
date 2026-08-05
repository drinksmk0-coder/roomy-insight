-- 1. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'Geral',
  preco numeric NOT NULL DEFAULT 0,
  estoque_atual integer NOT NULL DEFAULT 0,
  estoque_minimo integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS products_write ON public.products;
CREATE POLICY products_write ON public.products FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao','cafe']))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['dono','recepcao','cafe']));

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS products_company_idx ON public.products(company_id);

-- 2. SALES: colunas novas, sem tocar em dados existentes
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'hospede',
  ADD COLUMN IF NOT EXISTS consumidor text,
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comanda_id uuid;

ALTER TABLE public.sales ALTER COLUMN quarto DROP NOT NULL;

CREATE INDEX IF NOT EXISTS sales_comanda_idx ON public.sales(comanda_id);

-- 3. RPC transacional da comanda
CREATE OR REPLACE FUNCTION public.create_sale_order(
  _company_id uuid,
  _tipo text,
  _quarto integer,
  _reserva_id uuid,
  _cliente_id uuid,
  _consumidor text,
  _pagamento text,
  _data date,
  _itens jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _comanda uuid := gen_random_uuid();
  _it jsonb;
  _pid uuid;
  _qtd integer;
  _unit numeric;
  _nome text;
  _cat text;
  _prod public.products%ROWTYPE;
BEGIN
  IF NOT public.has_company_role(auth.uid(), _company_id, ARRAY['dono','recepcao','cafe']) THEN
    RAISE EXCEPTION 'Sem permissao para lancar vendas nesta empresa';
  END IF;

  IF _itens IS NULL OR jsonb_array_length(_itens) = 0 THEN
    RAISE EXCEPTION 'A comanda precisa de pelo menos um item';
  END IF;

  IF _tipo NOT IN ('hospede','funcionario') THEN
    RAISE EXCEPTION 'Tipo de comanda invalido: %', _tipo;
  END IF;

  IF _tipo = 'hospede' AND _quarto IS NULL THEN
    RAISE EXCEPTION 'Informe o quarto para comanda de hospede';
  END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _pid  := NULLIF(_it->>'produto_id','')::uuid;
    _qtd  := COALESCE((_it->>'qtd')::integer, 0);
    _unit := COALESCE((_it->>'valor_unit')::numeric, 0);
    _nome := NULLIF(trim(_it->>'item'), '');
    _cat  := COALESCE(NULLIF(trim(_it->>'categoria'), ''), 'Geral');

    IF _qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade invalida no item %', COALESCE(_nome, '(sem nome)');
    END IF;

    IF _pid IS NOT NULL THEN
      SELECT * INTO _prod FROM public.products
        WHERE id = _pid AND company_id = _company_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto nao encontrado nesta empresa';
      END IF;
      IF _prod.estoque_atual < _qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente para % (disponivel: %)', _prod.nome, _prod.estoque_atual;
      END IF;
      UPDATE public.products SET estoque_atual = estoque_atual - _qtd WHERE id = _pid;
      _nome := COALESCE(_nome, _prod.nome);
      _cat  := COALESCE(NULLIF(trim(_it->>'categoria'), ''), _prod.categoria);
    END IF;

    IF _nome IS NULL THEN
      RAISE EXCEPTION 'Informe a descricao do item';
    END IF;

    INSERT INTO public.sales
      (company_id, quarto, reserva_id, cliente_id, produto_id, comanda_id, tipo, consumidor,
       item, categoria, qtd, valor_unit, total, pagamento, data, created_by)
    VALUES
      (_company_id, _quarto, _reserva_id, _cliente_id, _pid, _comanda, _tipo, NULLIF(trim(_consumidor),''),
       _nome, _cat, _qtd, _unit, _qtd * _unit, COALESCE(NULLIF(_pagamento,''),'dinheiro'),
       COALESCE(_data, CURRENT_DATE), auth.uid());
  END LOOP;

  RETURN _comanda;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale_order(uuid,text,integer,uuid,uuid,text,text,date,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale_order(uuid,text,integer,uuid,uuid,text,text,date,jsonb) TO authenticated;