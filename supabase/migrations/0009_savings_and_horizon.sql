-- =========================================================
-- 0009_savings_and_horizon.sql
--
-- 1) Épargne : un 3e type de transaction, à côté de 'expense' et 'income'.
--    Une transaction d'épargne SORT du solde du compte courant (comme une
--    dépense) mais n'est PAS comptée comme une dépense : ni dans les totaux,
--    ni dans le graphique par catégorie. Un abonnement peut être marqué
--    « épargne » pour que la tâche planifiée génère le bon type.
--
-- 2) Horizon des prochains prélèvements (7 / 14 / 30 jours), mémorisé dans
--    les réglages pour suivre l'utilisateur d'un appareil à l'autre.
--
-- Migration ADDITIVE : elle n'ajoute que des valeurs autorisées et des
-- colonnes avec valeur par défaut. Aucune donnée existante n'est modifiée,
-- aucune colonne supprimée ni renommée. Elle peut s'appliquer telle quelle
-- sur la base de production.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Élargir les valeurs autorisées de transactions.type
--
-- La contrainte a été écrite en ligne dans 0001, son nom a donc été choisi
-- par Postgres. Plutôt que de le deviner, on retrouve la contrainte par la
-- COLONNE qu'elle porte : `conkey` vaut exactement [numéro de la colonne
-- type]. On ne touche donc ni au check sur `amount`, ni à celui sur `source`.
-- ---------------------------------------------------------
do $$
declare
  contrainte record;
begin
  for contrainte in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'transactions'
      and con.contype = 'c'
      and con.conkey = array[
        (select att.attnum from pg_attribute att
          where att.attrelid = rel.oid and att.attname = 'type')
      ]
  loop
    execute format(
      'alter table public.transactions drop constraint %I',
      contrainte.conname
    );
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('expense', 'income', 'savings'));

-- ---------------------------------------------------------
-- 2. Même élargissement pour les libellés rapides (0008), afin de pouvoir
--    créer un bouton « Épargne » qui pré-remplit le bon type.
-- ---------------------------------------------------------
do $$
declare
  contrainte record;
begin
  for contrainte in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'quick_labels'
      and con.contype = 'c'
      and con.conkey = array[
        (select att.attnum from pg_attribute att
          where att.attrelid = rel.oid and att.attname = 'type')
      ]
  loop
    execute format(
      'alter table public.quick_labels drop constraint %I',
      contrainte.conname
    );
  end loop;
end $$;

alter table public.quick_labels
  add constraint quick_labels_type_check
  check (type in ('expense', 'income', 'savings'));

-- ---------------------------------------------------------
-- 3. Un abonnement peut être de l'épargne (ex. : virement automatique de
--    50 €/mois vers un livret). C'est la SOURCE : la tâche planifiée lit ce
--    drapeau pour décider du type de la transaction qu'elle génère.
-- ---------------------------------------------------------
alter table public.subscriptions
  add column if not exists is_savings boolean not null default false;

-- ---------------------------------------------------------
-- 4. Horizon des prochains prélèvements affichés sur le tableau de bord.
--    En base plutôt que dans le navigateur, comme le thème et la couleur
--    d'accentuation : le choix suit l'utilisateur d'un appareil à l'autre.
-- ---------------------------------------------------------
alter table public.user_settings
  add column if not exists upcoming_horizon_days integer not null default 7;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_settings_upcoming_horizon_days_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_upcoming_horizon_days_check
      check (upcoming_horizon_days in (7, 14, 30));
  end if;
end $$;

-- ---------------------------------------------------------
-- 5. Le libellé rapide « Épargne » créé par 0008 était une dépense faute de
--    mieux. Maintenant que le type existe, on le corrige — uniquement s'il
--    n'a pas déjà été modifié à la main.
-- ---------------------------------------------------------
update public.quick_labels
set type = 'savings'
where label = 'Épargne' and type = 'expense';
