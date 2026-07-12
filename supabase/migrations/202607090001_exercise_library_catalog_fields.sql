alter table public.exercise_library
  add column if not exists category text,
  add column if not exists primary_group text,
  add column if not exists secondary_groups text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists technical_notes text;

create index if not exists exercise_library_owner_category_idx
on public.exercise_library (owner_id, category);

create index if not exists exercise_library_owner_primary_group_idx
on public.exercise_library (owner_id, primary_group);

create index if not exists exercise_library_tags_gin_idx
on public.exercise_library using gin (tags);

create index if not exists exercise_library_secondary_groups_gin_idx
on public.exercise_library using gin (secondary_groups);
