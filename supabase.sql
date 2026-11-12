-- Banco opcional para sincronização pública do PWA UTFPR - 2026.
-- ATENÇÃO: sem login, qualquer visitante com a URL pode alterar preferências.
-- Não armazene dados sensíveis ou credenciais nesses campos.
-- Execute no SQL Editor do projeto Supabase.

create table if not exists public.escala_config_2026 (
 id smallint primary key default 1 check(id = 1),
 rotation_day smallint not null default 1 check(rotation_day between 0 and 4),
 updated_at timestamptz not null default now()
);

create table if not exists public.escala_pessoas_2026 (
 id text primary key check(id in ('igor','vanessa','leticia','marcelo','kelly','fabio','fernando','adilson')),
 days integer[] not null default '{}',
 exceptions jsonb not null default '{}' check(jsonb_typeof(exceptions)='object'),
 updated_at timestamptz not null default now()
);

create or replace function public.escala_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists escala_config_touch on public.escala_config_2026;
create trigger escala_config_touch before update on public.escala_config_2026
for each row execute function public.escala_touch_updated_at();

drop trigger if exists escala_pessoas_touch on public.escala_pessoas_2026;
create trigger escala_pessoas_touch before update on public.escala_pessoas_2026
for each row execute function public.escala_touch_updated_at();

alter table public.escala_config_2026 enable row level security;
alter table public.escala_pessoas_2026 enable row level security;

-- Leitura e edição públicas, por escolha expressa do projeto.
drop policy if exists "Leitura publica da configuracao" on public.escala_config_2026;
create policy "Leitura publica da configuracao" on public.escala_config_2026 for select to anon using(true);
drop policy if exists "Edicao publica da configuracao" on public.escala_config_2026;
create policy "Edicao publica da configuracao" on public.escala_config_2026 for insert to anon with check(id=1);
drop policy if exists "Atualizacao publica da configuracao" on public.escala_config_2026;
create policy "Atualizacao publica da configuracao" on public.escala_config_2026 for update to anon using(id=1) with check(id=1);

drop policy if exists "Leitura publica das disponibilidades" on public.escala_pessoas_2026;
create policy "Leitura publica das disponibilidades" on public.escala_pessoas_2026 for select to anon using(true);
drop policy if exists "Edicao publica das disponibilidades" on public.escala_pessoas_2026;
create policy "Edicao publica das disponibilidades" on public.escala_pessoas_2026 for insert to anon with check(true);
drop policy if exists "Atualizacao publica das disponibilidades" on public.escala_pessoas_2026;
create policy "Atualizacao publica das disponibilidades" on public.escala_pessoas_2026 for update to anon using(true) with check(true);

grant usage on schema public to anon;
grant select,insert,update on public.escala_config_2026,public.escala_pessoas_2026 to anon;

insert into public.escala_config_2026(id,rotation_day) values(1,1)
on conflict(id) do nothing;
insert into public.escala_pessoas_2026(id,days) values
 ('igor',array[3]),('vanessa',array[0,1]),('leticia',array[3,4]),
 ('marcelo',array[0,1,2,3,4]),('kelly',array[1,3]),('fabio',array[0,4]),
 ('fernando',array[0,1,2,3]),('adilson',array[0,2,4])
on conflict(id) do nothing;
