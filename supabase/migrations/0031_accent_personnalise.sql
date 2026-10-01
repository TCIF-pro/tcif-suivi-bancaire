-- =========================================================
-- 0031_accent_personnalise.sql
-- Couleur d'accentuation « Personnalisée » (identifiant `custom`).
--
-- La personne ne choisit que la TEINTE (0 à 360) ; l'app calcule elle-même
-- la saturation et la luminosité pour chaque thème, avec un contraste
-- garanti (voir src/lib/accent-colors.ts). Aucune couleur libre n'est
-- stockée, donc aucune combinaison illisible possible.
--
-- - accent_teinte : la teinte choisie, vide si la couleur n'est pas
--   personnalisée. `custom` sans teinte retombe sur le Bleu par défaut.
-- - contrainte de accent_color (0005, élargie par 0028) : `custom` s'ajoute,
--   les valeurs existantes restent valables.
--
-- Additive : une colonne et une contrainte élargie, aucune donnée modifiée.
-- Rejouable.
-- =========================================================

alter table public.user_settings
  add column if not exists accent_teinte smallint
    check (accent_teinte between 0 and 360);

alter table public.user_settings
  drop constraint if exists user_settings_accent_color_check;

alter table public.user_settings
  add constraint user_settings_accent_color_check
  check (accent_color in ('brass', 'gold', 'terracotta', 'slate', 'olive', 'neon', 'custom'));
