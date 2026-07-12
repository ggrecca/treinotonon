alter table public.workouts
  add column if not exists objective text,
  add column if not exists frequency text,
  add column if not exists weekly_frequency text,
  add column if not exists notes text;
