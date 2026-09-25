-- =========================================================
-- 0017_demo_restrictions.sql
--
-- Ce que la base refuse au compte de démonstration (étape 6.3).
--
-- Le compte démo est le seul que n'importe qui peut ouvrir, sans que
-- l'administrateur l'ait créé pour lui. Un visiteur peut appeler l'API de
-- Supabase directement depuis la console de son navigateur, sans passer par
-- les écrans de l'app : masquer un formulaire ne protège donc rien. Tout ce
-- que la démo ne doit pas faire est refusé ICI.
--
-- Le compte démo est reconnu à `app_metadata.role = 'demo'`, qu'un
-- utilisateur ne peut pas modifier lui-même (seule la clé service_role le
-- peut).
--
-- Rejouable : `create or replace` et `drop ... if exists` partout.
-- Aucune donnée n'est modifiée.
-- =========================================================

-- ---------------------------------------------------------
-- La session en cours est-elle celle du compte démo ?
--
-- Lu dans le jeton de session (`auth.jwt()`), où Supabase recopie les
-- app_metadata. Sert aux règles RLS, qui s'évaluent pour l'utilisateur
-- connecté.
-- ---------------------------------------------------------
create or replace function public.est_compte_demo()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'demo', false);
$$;

-- ---------------------------------------------------------
-- 1. Stockage : la démo peut LIRE sa facture d'exemple, rien d'autre.
--
-- Sans ce refus, n'importe quel visiteur pourrait déposer des fichiers dans le
-- stockage (quota gratuit : 1 Go) — des fichiers que personne n'aurait vus —,
-- remplacer le PDF d'exemple par autre chose, ou le supprimer pour les
-- visiteurs suivants.
--
-- Les règles sont recréées à l'identique (0003, puis 0015 pour la
-- modification), avec la seule condition « pas le compte démo » en plus.
-- ---------------------------------------------------------
drop policy if exists "invoices_storage_insert_own" on storage.objects;
create policy "invoices_storage_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.est_compte_demo()
  );

drop policy if exists "invoices_storage_update_own" on storage.objects;
create policy "invoices_storage_update_own" on storage.objects for update
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.est_compte_demo()
  )
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.est_compte_demo()
  );

drop policy if exists "invoices_storage_delete_own" on storage.objects;
create policy "invoices_storage_delete_own" on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.est_compte_demo()
  );

-- ---------------------------------------------------------
-- 2. Support : la démo ne peut pas écrire.
--
-- Tous les visiteurs partagent le même compte, donc la même limite de 5
-- messages par heure : un seul visiteur la viderait pour les autres, et la
-- boîte de l'administrateur recevrait les messages d'inconnus.
-- ---------------------------------------------------------
drop policy if exists "support_messages_insert_own" on public.support_messages;
create policy "support_messages_insert_own" on public.support_messages for insert
  with check (auth.uid() = user_id and not public.est_compte_demo());

-- ---------------------------------------------------------
-- 3. Plafonds de lignes pour le compte démo.
--
-- Sans plafond, un script pourrait remplir la base gratuite (500 Mo) en
-- quelques minutes à travers le compte démo. Les plafonds sont très
-- au-dessus de ce qu'une vraie visite produit — le jeu de démonstration en
-- utilise une petite fraction —, et la remise à zéro nocturne repart de zéro.
--
-- Le compte démo est reconnu ici par auth.users et non par le jeton de
-- session : la vérification vaut aussi pour les écritures faites avec la clé
-- service_role (la tâche planifiée des abonnements, par exemple).
--
-- 'PT429' est renvoyé par PostgREST en HTTP 429 (« trop de requêtes »).
-- ---------------------------------------------------------
create or replace function public.plafond_compte_demo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plafond integer;
  existantes integer;
begin
  -- Les comptes ordinaires ne sont pas concernés : une seule lecture par
  -- clé primaire, et on s'arrête là.
  if not exists (
    select 1 from auth.users u
    where u.id = new.user_id
      and u.raw_app_meta_data ->> 'role' = 'demo'
  ) then
    return new;
  end if;

  plafond := case tg_table_name
    when 'transactions'  then 2000
    when 'subscriptions' then 100
    when 'categories'    then 100
    when 'quick_labels'  then 50
    when 'invoices'      then 50
    when 'accounts'      then 20
    else 100
  end;

  execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
    into existantes
    using new.user_id;

  if existantes >= plafond then
    raise exception 'Plafond du compte de démonstration atteint pour %', tg_table_name
      using errcode = 'PT429';
  end if;

  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['transactions', 'subscriptions', 'categories',
                           'quick_labels', 'invoices', 'accounts']
  loop
    execute format('drop trigger if exists plafond_compte_demo on public.%I', t);
    execute format(
      'create trigger plafond_compte_demo before insert on public.%I '
      || 'for each row execute function public.plafond_compte_demo()', t);
  end loop;
end $$;
