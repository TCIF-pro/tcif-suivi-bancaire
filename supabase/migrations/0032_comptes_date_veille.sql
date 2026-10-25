-- =========================================================
-- 0032_comptes_date_veille.sql
-- Nouveaux comptes : date de référence du solde à la VEILLE de l'inscription.
--
-- Le solde ne retient que les opérations STRICTEMENT postérieures à la date
-- de référence (règle volontaire, voir dashboard/page.tsx). Les comptes Pro
-- et Perso créés à l'inscription prenaient la date du jour : une dépense
-- saisie le jour même de l'inscription n'entrait pas dans le solde (même
-- piège que les livrets, corrigé par 0011 et accounts/create.ts).
--
-- Ne change que la fonction appelée à la création d'un compte TCIF : aucun
-- compte existant n'est modifié. Rejouable.
-- =========================================================

create or replace function public.handle_new_user_seed_accounts()
returns trigger as $$
begin
  insert into public.accounts (user_id, name, starting_balance_date) values
    (new.id, 'Pro', current_date - 1),
    (new.id, 'Perso', current_date - 1);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
