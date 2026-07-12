alter table public.exercise_library
  add column if not exists equipment_list text[] not null default '{}';

create index if not exists exercise_library_equipment_list_gin_idx
on public.exercise_library using gin (equipment_list);
