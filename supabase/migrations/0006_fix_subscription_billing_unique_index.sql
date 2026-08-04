-- =========================================================
-- 0006_fix_subscription_billing_unique_index.sql
-- L'index unique posé en 0001 était partiel (where subscription_id is not
-- null), ce qui empêche Postgres de le faire correspondre à un ON CONFLICT
-- (subscription_id, occurred_on) simple — nécessaire à l'upsert idempotent
-- de la route cron. La clause partielle était en fait inutile : un index
-- unique standard traite déjà chaque NULL comme distinct des autres, donc
-- les transactions manuelles/factures (subscription_id NULL) ne sont pas
-- affectées par ce changement.
-- =========================================================

drop index if exists public.transactions_subscription_billing_uniq;

create unique index transactions_subscription_billing_uniq
  on public.transactions(subscription_id, occurred_on);
