-- PWA de Escala UTFPR 2026 — Beta 0.4, SEM RODÍZIO.
-- Estrutura para sincronizar as disponibilidades dos servidores.
-- Acesso anônimo: qualquer pessoa com a URL do PWA poderá alterar preferências.
-- Não armazene senhas, dados sensíveis ou chaves secretas.
-- Se já utilizava a Beta 0.3, NÃO é necessário executar este arquivo novamente:
-- a tabela escala_pessoas_2026 continua igual; escala_config_2026 é ignorada.

create table if not exists public.escala_pessoas_2026 (
 id text primary key check(id in ('igor','vanessa','leticia','marcelo','kelly','fabio','fernando','adilson')),
 days integer[] not null default '{}',
 exceptions jsonb not null default '{}' check (jsonb_typeof(exceptions) = 'object'),
 updated_at timestamptz not null default now()
);

create or replace function public.escala_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists escala_pessoas_touch on public.escala_pessoas_2026;
create trigger escala_pessoas_touch before update on public.escala_pessoas_2026
for each row execute function public.escala_touch_updated_at();

alter table public.escala_pessoas_2026 enable row level security;
drop policy if exists "Leitura publica das disponibilidades" on public.escala_pessoas_2026;
create policy "Leitura publica das disponibilidades" on public.escala_pessoas_2026 for select to anon using(true);
drop policy if exists "Edicao publica das disponibilidades" on public.escala_pessoas_2026;
create policy "Edicao publica das disponibilidades" on public.escala_pessoas_2026 for insert to anon with check(true);
drop policy if exists "Atualizacao publica das disponibilidades" on public.escala_pessoas_2026;
create policy "Atualizacao publica das disponibilidades" on public.escala_pessoas_2026 for update to anon using(true) with check(true);

grant usage on schema public to anon;
grant select,insert,update on public.escala_pessoas_2026 to anon;

insert into public.escala_pessoas_2026(id,days) values
 ('igor',array[3]),('vanessa',array[0,1]),('leticia',array[3,4]),
 ('marcelo',array[0,1,2,3,4]),('kelly',array[1,3]),('fabio',array[0,4]),
 ('fernando',array[0,1,2,3]),('adilson',array[0,2,4])
on conflict(id) do nothing;
