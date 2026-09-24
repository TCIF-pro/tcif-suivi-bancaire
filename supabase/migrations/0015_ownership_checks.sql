-- =========================================================
-- 0015_ownership_checks.sql
--
-- Correctifs de l'audit de sécurité de l'étape 6.
--
-- 1) Une ligne ne peut référencer QUE des lignes de son propre propriétaire.
--
--    Une clé étrangère vérifie qu'une ligne référencée EXISTE, pas qu'elle
--    appartient au même utilisateur. L'audit l'a prouvé : un second compte a
--    pu rattacher sa transaction à une catégorie d'un autre utilisateur. Il
--    ne voyait rien chez lui — la RLS tient — mais la victime ne pouvait plus
--    supprimer sa catégorie, bloquée par une ligne qu'elle ne voit pas. La
--    même faille existait pour les comptes et les factures.
--
--    Le contrôle est fait par des DÉCLENCHEURS plutôt que dans les règles RLS :
--    une règle RLS ne s'applique pas à la clé service_role, alors qu'un
--    déclencheur s'applique à tout le monde. La tâche planifiée, qui tourne
--    avec cette clé et recopie les références des abonnements, est donc
--    couverte elle aussi.
--
-- 2) La règle de modification du stockage vérifie aussi l'état APRÈS
--    modification (`with check`). Sans elle, seule une vérification interne
--    de Supabase empêchait de déplacer un fichier vers le dossier d'un autre
--    utilisateur — elle a tenu pendant l'audit, mais la sécurité ne doit pas
--    reposer sur un comportement non documenté.
--
-- Rejouable : `create or replace` et `drop ... if exists` partout.
-- Aucune donnée n'est modifiée.
-- =========================================================

-- ---------------------------------------------------------
-- Fonction utilitaire : la ligne `p_id` de la table `p_table` appartient-elle
-- à `p_user` ? Une référence vide (null) est toujours acceptée.
--
-- `security definer` : la vérification lit la table cible en contournant la
-- RLS, et compare explicitement `user_id`. Sans ça, sous la clé service_role,
-- le résultat dépendrait de qui exécute la requête.
--
-- `p_table` n'est jamais une donnée utilisateur : seuls les déclencheurs
-- ci-dessous l'appellent, avec des noms écrits en dur. `%I` le cite quand même
-- comme un identifiant, par principe.
-- ---------------------------------------------------------
create or replace function public.reference_appartient(p_table text, p_id uuid, p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  if p_id is null then
    return true;
  end if;

  execute format('select exists (select 1 from public.%I where id = $1 and user_id = $2)', p_table)
    into ok
    using p_id, p_user;

  return ok;
end;
$$;

-- Personne n'a à l'appeler directement : exposée, elle servirait d'oracle
-- (« cet identifiant appartient-il à tel utilisateur ? ») via l'API RPC.
-- Les déclencheurs ci-dessous restent autorisés à l'appeler parce qu'ils
-- s'exécutent avec les droits du propriétaire (`security definer`).
revoke all on function public.reference_appartient(text, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------
-- Les déclencheurs lèvent l'erreur 42501 (« insufficient_privilege »), que
-- PostgREST traduit en HTTP 403 : l'app reçoit un refus explicite, pas une
-- erreur 500.
--
-- Ils sont `security definer` : ils s'exécutent avec les droits du
-- propriétaire de la base et non de l'utilisateur, ce qui leur permet
-- d'appeler `reference_appartient` alors qu'elle est retirée aux utilisateurs.
-- ---------------------------------------------------------

-- ---------------------------------------------------------
-- transactions : catégorie, compte, compte d'arrivée, facture, abonnement
-- ---------------------------------------------------------
create or replace function public.verifier_references_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.reference_appartient('categories', new.category_id, new.user_id) then
    raise exception 'category_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('accounts', new.account_id, new.user_id) then
    raise exception 'account_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('accounts', new.transfer_account_id, new.user_id) then
    raise exception 'transfer_account_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('invoices', new.invoice_id, new.user_id) then
    raise exception 'invoice_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('subscriptions', new.subscription_id, new.user_id) then
    raise exception 'subscription_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists verifier_references on public.transactions;
create trigger verifier_references
  before insert or update on public.transactions
  for each row execute function public.verifier_references_transactions();

-- ---------------------------------------------------------
-- subscriptions : catégorie, compte, compte d'arrivée
-- ---------------------------------------------------------
create or replace function public.verifier_references_subscriptions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.reference_appartient('categories', new.category_id, new.user_id) then
    raise exception 'category_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('accounts', new.account_id, new.user_id) then
    raise exception 'account_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('accounts', new.transfer_account_id, new.user_id) then
    raise exception 'transfer_account_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists verifier_references on public.subscriptions;
create trigger verifier_references
  before insert or update on public.subscriptions
  for each row execute function public.verifier_references_subscriptions();

-- ---------------------------------------------------------
-- invoices : catégorie, compte, devis d'origine
-- ---------------------------------------------------------
create or replace function public.verifier_references_invoices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.reference_appartient('categories', new.category_id, new.user_id) then
    raise exception 'category_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('accounts', new.account_id, new.user_id) then
    raise exception 'account_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  if not public.reference_appartient('invoices', new.converted_from_devis_id, new.user_id) then
    raise exception 'converted_from_devis_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists verifier_references on public.invoices;
create trigger verifier_references
  before insert or update on public.invoices
  for each row execute function public.verifier_references_invoices();

-- ---------------------------------------------------------
-- quick_labels : catégorie
-- ---------------------------------------------------------
create or replace function public.verifier_references_quick_labels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.reference_appartient('categories', new.category_id, new.user_id) then
    raise exception 'category_id fait référence à une ligne d''un autre utilisateur' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists verifier_references on public.quick_labels;
create trigger verifier_references
  before insert or update on public.quick_labels
  for each row execute function public.verifier_references_quick_labels();

-- ---------------------------------------------------------
-- 2) Stockage : la modification vérifie aussi la destination
-- ---------------------------------------------------------
drop policy if exists "invoices_storage_update_own" on storage.objects;

create policy "invoices_storage_update_own" on storage.objects for update
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
