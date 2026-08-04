-- =========================================================
-- 0002_seed_categories.sql
-- Seed automatique des 5 catégories par défaut dès qu'un compte
-- est créé dans Supabase Auth (utile ici car il n'y aura qu'un
-- seul compte, créé manuellement dans le dashboard Supabase).
-- =========================================================

create or replace function public.handle_new_user_seed_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name) values
    (new.id, 'Pro'),
    (new.id, 'Perso'),
    (new.id, 'Abonnements'),
    (new.id, 'Rénovation'),
    (new.id, 'Autre');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_seed_categories();
