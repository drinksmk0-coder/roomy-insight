-- Multiple-item sales, staff purchases and auditable inventory movements.
alter table public.sales
  add column if not exists comprador_tipo text not null default 'hospede',
  add column if not exists comprador_nome text,
  add column if not exists lote_id uuid;

alter table public.products
  add column if not exists custo_unitario numeric not null default 0,
  add column if not exists estoque_total_entradas integer not null default 0;

update public.products
set estoque_total_entradas = greatest(estoque_total_entradas, estoque_atual)
where estoque_total_entradas = 0 and estoque_atual > 0;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  produto_id uuid not null references public.products(id) on delete restrict,
  tipo text not null check (tipo in ('entrada','venda','ajuste')),
  quantidade integer not null,
  estoque_anterior integer not null,
  estoque_novo integer not null,
  motivo text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.inventory_movements enable row level security;
grant select, insert on public.inventory_movements to authenticated;
grant all on public.inventory_movements to service_role;

drop policy if exists inventory_movements_staff on public.inventory_movements;
create policy inventory_movements_staff on public.inventory_movements
for all to authenticated
using (public.is_staff((select auth.uid())))
with check (public.is_staff((select auth.uid())));

create or replace function public.restock_product(_product_id uuid, _quantity integer, _reason text default 'Reposição')
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_stock integer;
  new_stock integer;
  product_company uuid;
begin
  if _quantity <= 0 then raise exception 'A quantidade da reposição deve ser maior que zero'; end if;
  select estoque_atual, company_id into old_stock, product_company from public.products where id = _product_id for update;
  if not found then raise exception 'Produto não encontrado'; end if;
  new_stock := old_stock + _quantity;
  update public.products
     set estoque_atual = new_stock,
         estoque_total_entradas = estoque_total_entradas + _quantity
   where id = _product_id;
  insert into public.inventory_movements(company_id, produto_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo)
  values (product_company, _product_id, 'entrada', _quantity, old_stock, new_stock, coalesce(nullif(trim(_reason),''),'Reposição'));
end;
$$;

create or replace function public.adjust_product_stock(_product_id uuid, _physical_stock integer, _reason text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_stock integer;
  delta integer;
  product_company uuid;
begin
  if _physical_stock < 0 then raise exception 'O estoque físico não pode ser negativo'; end if;
  if coalesce(trim(_reason),'') = '' then raise exception 'Informe o motivo do ajuste'; end if;
  select estoque_atual, company_id into old_stock, product_company from public.products where id = _product_id for update;
  if not found then raise exception 'Produto não encontrado'; end if;
  delta := _physical_stock - old_stock;
  update public.products set estoque_atual = _physical_stock where id = _product_id;
  insert into public.inventory_movements(company_id, produto_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo)
  values (product_company, _product_id, 'ajuste', delta, old_stock, _physical_stock, trim(_reason));
end;
$$;

create or replace function public.decrement_product_stock_on_sale()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_stock integer;
  new_stock integer;
  product_company uuid;
begin
  if new.produto_id is not null then
    select estoque_atual, company_id into old_stock, product_company from public.products where id = new.produto_id for update;
    if not found or old_stock < greatest(new.qtd, 0) then raise exception 'Estoque insuficiente para este produto'; end if;
    new_stock := old_stock - greatest(new.qtd, 0);
    update public.products set estoque_atual = new_stock where id = new.produto_id;
    insert into public.inventory_movements(company_id, produto_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo)
    values (product_company, new.produto_id, 'venda', -greatest(new.qtd, 0), old_stock, new_stock,
      concat('Venda para ', coalesce(new.comprador_nome, new.quarto::text)));
  end if;
  return new;
end;
$$;
