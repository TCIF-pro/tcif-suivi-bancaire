-- =========================================================
-- 0019_theme_sombre_par_defaut.sql
-- Un compte neuf démarre en thème sombre, comme l'écran de connexion.
--
-- Sans session, l'app sert déjà le thème sombre (écran de connexion). Mais un
-- compte neuf avait le thème clair par défaut (0004) : l'écran de choix du
-- mot de passe, puis le tableau de bord, passaient brusquement au clair.
--
-- Seule la valeur PAR DÉFAUT change : elle ne s'applique qu'aux lignes créées
-- après cette migration (trigger handle_new_user_seed_settings). Les comptes
-- existants gardent le thème qu'ils ont — aucune donnée n'est modifiée — et
-- chacun peut toujours changer de thème dans Réglages.
--
-- Rejouable sans risque : redéfinir la même valeur par défaut ne fait rien.
-- =========================================================

alter table public.user_settings alter column theme set default 'dark';
