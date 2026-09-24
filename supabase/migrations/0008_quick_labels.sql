-- =========================================================
-- 0008_quick_labels.sql
-- Libellés rapides : les boutons du formulaire d'ajout qui remplissent
-- en un clic le libellé, le type et la catégorie d'une transaction.
--
-- Migration ADDITIVE : elle ne crée qu'une table et ses policies, ne
-- supprime ni ne renomme rien. Elle peut s'appliquer telle quelle sur la
-- base de production le jour de la mise en ligne.
-- =========================================================

create table public.quick_labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  label       text not null,
  -- Mêmes valeurs que transactions.type : le bouton pré-remplit ce champ.
  type        text not null check (type in ('expense', 'income')),
  -- Facultative, et volontairement SANS `on delete cascade` : supprimer une
  -- catégorie encore utilisée doit échouer plutôt que d'effacer en silence
  -- les libellés qui s'en servent (même choix que transactions.category_id).
  category_id uuid references public.categories(id),

  -- Ordre d'affichage des boutons, réglable par l'utilisateur plus tard.
  position    integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index quick_labels_user_position_idx
  on public.quick_labels(user_id, position);

-- RLS : chacun ne voit et ne modifie que ses propres libellés.
alter table public.quick_labels enable row level security;

create policy "quick_labels_select_own" on public.quick_labels for select
  using (auth.uid() = user_id);
create policy "quick_labels_insert_own" on public.quick_labels for insert
  with check (auth.uid() = user_id);
create policy "quick_labels_update_own" on public.quick_labels for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quick_labels_delete_own" on public.quick_labels for delete
  using (auth.uid() = user_id);

-- Libellés de départ, pour que l'écran ne soit pas vide à la première
-- ouverture. Le `where not exists` rend la migration rejouable sans créer
-- de doublons, et chaque libellé est rattaché à la catégorie de même nom
-- si elle existe chez cet utilisateur (sinon il reste sans catégorie).
insert into public.quick_labels (user_id, label, type, category_id, position)
select
  u.id,
  d.label,
  d.type,
  (select c.id from public.categories c
    where c.user_id = u.id and c.name = d.category_name limit 1),
  d.position
from auth.users u
cross join (values
  ('Loyer',    'expense', 'Perso',       1),
  ('Courses',  'expense', 'Perso',       2),
  ('Essence',  'expense', 'Perso',       3),
  ('Salaire',  'income',  'Pro',         4),
  ('Épargne',  'expense', 'Abonnements', 5)
) as d(label, type, category_name, position)
where not exists (
  select 1 from public.quick_labels q
  where q.user_id = u.id and q.label = d.label
);
