-- =========================================================
-- 0024_jour_prelevement.sql
-- Retient le jour de prélèvement d'origine de chaque abonnement.
--
-- Avant, la prochaine échéance était calculée en ajoutant « un mois » à la
-- date courante : le 31 janvier donnait le 3 mars (le 31 février n'existe
-- pas), février était sauté et l'abonnement glissait au 3 pour toujours.
-- Désormais l'échéance vise ce jour-là, ramené au dernier jour des mois plus
-- courts : 31 janvier → 28 février → 31 mars. Pour retrouver le 31 après un
-- 28 février, il faut s'en souvenir : c'est cette colonne.
--
-- Additive : une colonne, remplie avec le jour actuel des échéances, et un
-- trigger qui la remplit seul à la création d'un abonnement.
-- Rejouable sans risque.
-- =========================================================

alter table public.subscriptions
  add column if not exists jour_prelevement smallint
    check (jour_prelevement between 1 and 31);

update public.subscriptions
set jour_prelevement = extract(day from next_billing_date)::smallint
where jour_prelevement is null;

-- À la création, sans jour précisé : celui de la première échéance. Le
-- formulaire de modification, lui, le met à jour quand on change la date.
create or replace function public.subscriptions_jour_prelevement_par_defaut()
returns trigger as $$
begin
  if new.jour_prelevement is null then
    new.jour_prelevement := extract(day from new.next_billing_date)::smallint;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists subscriptions_jour_prelevement_par_defaut on public.subscriptions;
create trigger subscriptions_jour_prelevement_par_defaut
  before insert on public.subscriptions
  for each row execute function public.subscriptions_jour_prelevement_par_defaut();
