-- =========================================================
-- 0012_default_seed.sql
--
-- Allège ce qu'un nouveau compte reçoit à sa création, et comble un manque.
--
-- 1) Catégories par défaut : Pro, Perso, Abonnements. « Rénovation » et
--    « Autre » sont retirées de la liste de départ — mieux vaut partir de peu
--    et ajouter au besoin, l'app permet désormais de gérer ses catégories.
--
-- 2) Libellés rapides par défaut : Loyer et Salaire. La migration 0008 les
--    avait installés pour les comptes EXISTANTS, mais rien ne le faisait pour
--    un nouveau compte : il serait arrivé sans aucun libellé. Le déclencheur
--    s'en charge maintenant, ce qui prépare l'ouverture à d'autres
--    utilisateurs (étape 6).
--
-- NE TOUCHE AUCUNE DONNÉE EXISTANTE : cette migration ne modifie que ce qui
-- sera créé à l'avenir. Les catégories et libellés déjà en base restent en
-- place — ils se suppriment depuis les Réglages, utilisateur par utilisateur.
-- =========================================================

-- Nouveau nom : la fonction ne crée plus seulement des catégories, la garder
-- sous son ancien nom serait trompeur pour qui relit le schéma.
create or replace function public.handle_new_user_seed_defaults()
returns trigger as $$
declare
  id_pro   uuid;
  id_perso uuid;
begin
  insert into public.categories (user_id, name) values
    (new.id, 'Pro'),
    (new.id, 'Perso'),
    (new.id, 'Abonnements');

  select id into id_pro   from public.categories
    where user_id = new.id and name = 'Pro'   limit 1;
  select id into id_perso from public.categories
    where user_id = new.id and name = 'Perso' limit 1;

  insert into public.quick_labels (user_id, label, type, category_id, position) values
    (new.id, 'Loyer',   'expense', id_perso, 1),
    (new.id, 'Salaire', 'income',  id_pro,   2);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Bascule du déclencheur vers la nouvelle fonction. Aucune donnée n'est
-- concernée : un déclencheur ne s'exécute qu'à la création d'un compte.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_seed_defaults();

drop function if exists public.handle_new_user_seed_categories();
