-- =========================================================
-- 0018_tutoriel_bienvenue.sql
--
-- Retient qu'un compte a vu le tutoriel de bienvenue.
--
-- Une colonne de user_settings, vide tant que le tutoriel n'a pas été fermé
-- (« C'est parti », « Passer » ou Échap). Dans user_settings et non dans le
-- navigateur : le tutoriel ne doit revenir sur aucun autre appareil. Et pas
-- dans les app_metadata : il n'y a rien à protéger ici, au pire quelqu'un
-- sauterait son propre tutoriel.
--
-- Chaque nouveau compte reçoit sa ligne user_settings par un déclencheur
-- (migration 0004) : la colonne y est vide d'office, le tutoriel s'affichera
-- à sa première vraie arrivée dans l'app.
--
-- Migration ADDITIVE. Rejouable sans effet de bord : tout est dans un bloc
-- qui ne s'exécute que si la colonne n'existe pas encore. Rejouer le
-- rattrapage plus tard marquerait à tort comme « vu » un compte arrivé entre
-- temps sans l'avoir vu.
-- =========================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_settings'
      and column_name = 'tutoriel_vu_le'
  ) then
    return;
  end if;

  alter table public.user_settings add column tutoriel_vu_le timestamptz;

  -- Rattrapage : les comptes qui utilisent DÉJÀ l'app ne doivent pas voir le
  -- tutoriel surgir d'un coup. Sauf ceux qui n'ont encore jamais fait leur
  -- première vraie connexion — mot de passe provisoire pas encore changé — :
  -- ils le découvriront à leur arrivée, comme les comptes créés après.
  update public.user_settings s
  set tutoriel_vu_le = now()
  from auth.users u
  where u.id = s.user_id
    and coalesce((u.raw_app_meta_data ->> 'must_change_password')::boolean, false) = false;
end $$;
