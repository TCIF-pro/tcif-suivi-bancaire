-- =========================================================
-- 0025_inscription.sql
-- Inscription en libre-service (V3, phase 2).
--
-- 1. user_settings.conditions_acceptees_le / conditions_version : preuve de
--    l'acceptation des conditions générales et de la politique de
--    confidentialité à l'inscription (date et version). C'est à l'éditeur de
--    pouvoir la prouver. Vide pour les comptes créés depuis /admin.
--    user_settings.confirmation_envoyee_le : dernier email de confirmation
--    envoyé, pour ne pas en renvoyer plus d'un par minute à une adresse.
--
-- 2. public.compte_par_email(email) : dit si une adresse a déjà un compte,
--    et s'il est confirmé. L'API de Supabase ne permet pas de chercher un
--    utilisateur par email ; sans cette fonction, une nouvelle inscription
--    sur une adresse déjà inscrite mais pas encore confirmée passerait sans
--    erreur. Réservée à la clé service_role : ni les visiteurs ni les
--    utilisateurs connectés ne peuvent l'appeler (sinon, n'importe qui
--    saurait qui a un compte).
--
-- Additive : trois colonnes et une fonction, rien de supprimé ni de renommé.
-- Rejouable sans risque.
-- =========================================================

alter table public.user_settings
  add column if not exists conditions_acceptees_le timestamptz,
  add column if not exists conditions_version text,
  add column if not exists confirmation_envoyee_le timestamptz;

create or replace function public.compte_par_email(p_email text)
returns table (id uuid, confirme boolean, cree_le timestamptz)
language sql
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at is not null, u.created_at
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.compte_par_email(text) from public, anon, authenticated;
grant execute on function public.compte_par_email(text) to service_role;
