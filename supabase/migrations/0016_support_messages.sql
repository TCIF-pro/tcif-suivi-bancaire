-- =========================================================
-- 0016_support_messages.sql
--
-- Messages envoyés au support depuis l'app (étape 6.2).
--
-- Les règles importantes sont appliquées PAR LA BASE, et pas seulement par
-- l'app. Un utilisateur connecté peut écrire dans cette table directement via
-- l'API Supabase, sans passer par le formulaire : tout ce que le formulaire
-- vérifie, il pourrait le contourner. D'où :
--   - l'email de l'expéditeur, recopié depuis son compte par un déclencheur —
--     une valeur envoyée par le client est ignorée ;
--   - la limite de 5 messages par heure, vérifiée par ce même déclencheur ;
--   - les longueurs maximales, en contraintes CHECK.
--
-- Migration ADDITIVE : une table et ses règles, rien d'autre.
-- =========================================================

create table public.support_messages (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  -- Recopié depuis auth.users par le déclencheur ci-dessous : l'expéditeur ne
  -- peut pas se faire passer pour quelqu'un d'autre.
  email                text not null,

  subject              text not null check (char_length(subject) between 1 and 150),
  message              text not null check (char_length(message) between 1 and 5000),

  -- L'email de notification est parti ? Le message est TOUJOURS enregistré
  -- d'abord : si l'envoi échoue, il reste visible dans /admin, marqué comme
  -- non notifié, au lieu d'être perdu.
  notification_envoyee boolean not null default false,

  -- Coché par l'admin une fois la demande réglée.
  traite               boolean not null default false,

  created_at           timestamptz not null default now()
);

create index support_messages_created_idx on public.support_messages(created_at desc);
create index support_messages_user_created_idx on public.support_messages(user_id, created_at);

-- ---------------------------------------------------------
-- RLS : le moindre privilège.
--
-- Un utilisateur peut ÉCRIRE ses propres messages, et c'est tout : pas de
-- relecture, pas de modification, pas de suppression. L'administrateur les
-- consulte depuis /admin, avec la clé service_role, derrière la vérification
-- de son rôle.
-- ---------------------------------------------------------
alter table public.support_messages enable row level security;

create policy "support_messages_insert_own" on public.support_messages for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Déclencheur : email réel de l'expéditeur + limite d'envoi.
--
-- `security definer` : il lit auth.users et compte les messages de
-- l'utilisateur, deux choses que la RLS lui interdirait sinon.
--
-- La limite protège ta boîte mail et ton quota d'envoi (100 emails par jour
-- sur l'offre gratuite de Resend) : sans elle, un seul compte pourrait les
-- épuiser en quelques secondes.
--
-- Le code d'erreur 'PT429' est une convention de PostgREST : il est renvoyé
-- tel quel en HTTP 429 (« trop de requêtes »), ce qui permet à l'app de
-- reconnaître ce cas et d'afficher un message clair.
-- ---------------------------------------------------------
create or replace function public.preparer_message_support()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recents integer;
begin
  select u.email into new.email from auth.users u where u.id = new.user_id;

  select count(*) into recents
  from public.support_messages m
  where m.user_id = new.user_id
    and m.created_at > now() - interval '1 hour';

  if recents >= 5 then
    raise exception 'Limite de 5 messages par heure atteinte' using errcode = 'PT429';
  end if;

  -- Ces deux champs appartiennent à l'app, pas à l'expéditeur.
  new.notification_envoyee := false;
  new.traite := false;
  new.created_at := now();

  return new;
end;
$$;

create trigger preparer_message_support
  before insert on public.support_messages
  for each row execute function public.preparer_message_support();
