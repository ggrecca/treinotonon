-- Já aplicada no projeto Supabase. Mantida no repositório para instalações novas.
alter table public.workout_exercises
  add column if not exists conjugate_block_id uuid null,
  add column if not exists conjugate_position integer null,
  add column if not exists conjugate_kind text null;


-- conjugate_block_id é um identificador de agrupamento, não uma referência.
alter table public.workout_exercises
  drop constraint if exists workouts_exercises_conjugate_block_fk;

alter table public.workout_exercises
  drop constraint if exists workout_exercises_conjugate_block_fk;

alter table public.workout_exercises
  drop constraint if exists workout_exercises_conjugate_block_id_fkey;

do $drop_conjugate_fk$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.workout_exercises'::regclass
      and c.contype = 'f'
      and a.attname = 'conjugate_block_id'
  loop
    execute format('alter table public.workout_exercises drop constraint if exists %I', v_constraint.conname);
  end loop;
end
$drop_conjugate_fk$;

create index if not exists workout_exercises_workout_conjugate_block_idx
  on public.workout_exercises (workout_id, conjugate_block_id);

alter table public.workout_exercises
  drop constraint if exists workout_exercises_conjugate_position_check;

alter table public.workout_exercises
  add constraint workout_exercises_conjugate_position_check
  check (conjugate_position is null or conjugate_position > 0);
