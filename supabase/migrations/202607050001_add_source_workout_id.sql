alter table public.workouts
add column if not exists source_workout_id uuid references public.workouts(id) on delete set null;

create index if not exists workouts_source_workout_idx
on public.workouts (source_workout_id);
