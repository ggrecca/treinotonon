create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  role text not null default 'athlete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('athlete', 'coach', 'both'))
);

create table public.coach_students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  student_email text not null,
  status text not null default 'pending',
  objective text,
  notes text,
  accepted_at timestamptz,
  refused_at timestamptz,
  inactive_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_students_status_check check (status in ('pending', 'active', 'refused', 'inactive')),
  constraint coach_students_distinct_users check (student_id is null or coach_id <> student_id),
  constraint coach_students_email_lower check (student_email = lower(student_email))
);

create unique index coach_students_unique_invite_idx
on public.coach_students (coach_id, student_email);

create index coach_students_coach_status_idx on public.coach_students (coach_id, status);
create index coach_students_student_status_idx on public.coach_students (student_id, status);
create index coach_students_email_status_idx on public.coach_students (student_email, status);

create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  instructions text,
  notes text,
  default_rest_seconds integer,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_library_rest_check check (default_rest_seconds is null or default_rest_seconds between 1 and 3600)
);

create index exercise_library_owner_name_idx on public.exercise_library (owner_id, lower(name));
create index exercise_library_owner_group_idx on public.exercise_library (owner_id, muscle_group);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'personal',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workouts_type_check check (type in ('personal', 'student', 'template')),
  constraint workouts_type_shape_check check (
    (type = 'personal' and coach_id is null and student_id is null)
    or (type = 'template' and coach_id is not null and student_id is null)
    or (type = 'student' and coach_id is not null and student_id is not null)
  )
);

create index workouts_owner_type_idx on public.workouts (owner_id, type);
create index workouts_coach_student_idx on public.workouts (coach_id, student_id, type);
create index workouts_student_active_idx on public.workouts (student_id, is_active);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid references public.exercise_library(id) on delete set null,
  order_index integer not null default 0,
  name text not null,
  muscle_group text,
  method text not null default 'normal',
  sets integer not null default 1,
  reps text,
  prescribed_load numeric,
  rest_between_sets integer,
  rest_after_exercise integer,
  coach_notes text,
  general_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_method_check check (method in ('normal', 'progressive', 'drop_set', 'pyramid', 'bi_set', 'tri_set', 'rest_pause')),
  constraint workout_exercises_sets_check check (sets between 1 and 30),
  constraint workout_exercises_rest_between_check check (rest_between_sets is null or rest_between_sets between 1 and 3600),
  constraint workout_exercises_rest_after_check check (rest_after_exercise is null or rest_after_exercise between 1 and 3600)
);

create index workout_exercises_workout_order_idx on public.workout_exercises (workout_id, order_index);

create table public.prescribed_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_index integer not null,
  target_reps text,
  target_load numeric,
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescribed_sets_index_check check (set_index >= 1),
  constraint prescribed_sets_rest_check check (rest_seconds is null or rest_seconds between 1 and 3600),
  constraint prescribed_sets_unique_index unique (workout_exercise_id, set_index)
);

create table public.prescribed_drops (
  id uuid primary key default gen_random_uuid(),
  prescribed_set_id uuid not null references public.prescribed_sets(id) on delete cascade,
  drop_index integer not null,
  target_reps text,
  target_load numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescribed_drops_index_check check (drop_index >= 1),
  constraint prescribed_drops_unique_index unique (prescribed_set_id, drop_index)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer,
  status text not null default 'in_progress',
  total_volume numeric,
  completion_percentage numeric,
  student_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_status_check check (status in ('in_progress', 'completed', 'discarded')),
  constraint workout_sessions_duration_check check (duration_seconds is null or duration_seconds >= 0),
  constraint workout_sessions_completion_check check (completion_percentage is null or completion_percentage between 0 and 100)
);

create index workout_sessions_student_started_idx on public.workout_sessions (student_id, started_at desc);
create index workout_sessions_coach_started_idx on public.workout_sessions (coach_id, started_at desc);
create index workout_sessions_workout_idx on public.workout_sessions (workout_id);

create table public.performed_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete restrict,
  prescribed_set_id uuid references public.prescribed_sets(id) on delete set null,
  set_index integer not null,
  performed_reps text,
  performed_load numeric,
  completed boolean not null default false,
  rpe integer,
  rest_seconds integer,
  student_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performed_sets_index_check check (set_index >= 1),
  constraint performed_sets_rpe_check check (rpe is null or rpe between 1 and 10),
  constraint performed_sets_rest_check check (rest_seconds is null or rest_seconds between 0 and 3600)
);

create index performed_sets_session_idx on public.performed_sets (session_id, set_index);

create table public.performed_drops (
  id uuid primary key default gen_random_uuid(),
  performed_set_id uuid not null references public.performed_sets(id) on delete cascade,
  prescribed_drop_id uuid references public.prescribed_drops(id) on delete set null,
  drop_index integer not null,
  performed_reps text,
  performed_load numeric,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performed_drops_index_check check (drop_index >= 1),
  constraint performed_drops_unique_index unique (performed_set_id, drop_index)
);

create table public.body_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  weight numeric,
  height numeric,
  age integer,
  body_fat numeric,
  waist numeric,
  hip numeric,
  chest numeric,
  arm numeric,
  thigh numeric,
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_records_age_check check (age is null or age between 1 and 120),
  constraint body_records_subject_check check (student_id is null or user_id = student_id)
);

create index body_records_user_recorded_idx on public.body_records (user_id, recorded_at desc);
create index body_records_student_recorded_idx on public.body_records (student_id, recorded_at desc);
create index body_records_coach_recorded_idx on public.body_records (coach_id, recorded_at desc);

create or replace function public.auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_active_coach_for(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_students cs
    where cs.coach_id = auth.uid()
      and cs.student_id = target_student_id
      and cs.status = 'active'
  );
$$;

create or replace function public.has_active_coach_student_link(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_students cs
    where cs.status = 'active'
      and (
        (cs.coach_id = user_a and cs.student_id = user_b)
        or
        (cs.coach_id = user_b and cs.student_id = user_a)
      )
  );
$$;

create or replace function public.can_access_workout(target_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workouts w
    where w.id = target_workout_id
      and (
        w.owner_id = auth.uid()
        or (w.type = 'student' and w.student_id = auth.uid())
        or (w.type = 'student' and w.coach_id = auth.uid() and public.is_active_coach_for(w.student_id))
        or (w.type = 'template' and w.coach_id = auth.uid())
      )
  );
$$;

create or replace function public.can_edit_prescription(target_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workouts w
    where w.id = target_workout_id
      and (
        (w.type = 'personal' and w.owner_id = auth.uid())
        or (w.type = 'template' and w.coach_id = auth.uid())
        or (w.type = 'student' and w.coach_id = auth.uid() and public.is_active_coach_for(w.student_id))
      )
  );
$$;

create or replace function public.can_access_workout_exercise(target_workout_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workout_exercises we
    where we.id = target_workout_exercise_id
      and public.can_access_workout(we.workout_id)
  );
$$;

create or replace function public.can_edit_workout_exercise(target_workout_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workout_exercises we
    where we.id = target_workout_exercise_id
      and public.can_edit_prescription(we.workout_id)
  );
$$;

create or replace function public.can_access_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workout_sessions ws
    where ws.id = target_session_id
      and (
        ws.student_id = auth.uid()
        or (ws.coach_id = auth.uid() and public.is_active_coach_for(ws.student_id))
      )
  );
$$;

create or replace function public.can_edit_session_execution(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workout_sessions ws
    where ws.id = target_session_id
      and ws.student_id = auth.uid()
  );
$$;

create or replace function public.validate_coach_students_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() <> new.coach_id then
    raise exception 'coach_id must match authenticated user';
  end if;

  new.status := 'pending';
  new.student_id := null;
  new.accepted_at := null;
  new.refused_at := null;
  new.inactive_at := null;
  new.student_email := lower(new.student_email);
  return new;
end;
$$;

create or replace function public.validate_coach_students_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.coach_id then
    if new.coach_id <> old.coach_id
      or new.student_id is distinct from old.student_id
      or new.student_email <> old.student_email then
      raise exception 'coaches may not change invite ownership';
    end if;

    if new.status <> old.status then
      if not (
        (old.status = 'active' and new.status = 'inactive')
        or (old.status = 'pending' and new.status = 'inactive')
      ) then
        raise exception 'only students may accept or refuse invitations';
      end if;
    end if;

    new.accepted_at := old.accepted_at;
    new.refused_at := old.refused_at;
    if new.status = 'inactive' and old.status <> 'inactive' then
      new.inactive_at := now();
    else
      new.inactive_at := old.inactive_at;
    end if;
    return new;
  end if;

  if auth.uid() = old.student_id or (old.student_id is null and old.student_email = public.auth_email()) then
    if new.coach_id <> old.coach_id
      or new.student_email <> old.student_email
      or coalesce(new.objective, '') <> coalesce(old.objective, '')
      or coalesce(new.notes, '') <> coalesce(old.notes, '') then
      raise exception 'students may only answer their coach invitation';
    end if;

    if not (
      old.status = 'pending'
      and new.status in ('active', 'refused')
    ) then
      raise exception 'students may only accept or refuse invitations';
    end if;

    if new.student_id is not null and new.student_id <> auth.uid() then
      raise exception 'student_id must match authenticated user';
    end if;

    new.student_id := auth.uid();
    if new.status = 'active' then
      new.accepted_at := now();
      new.refused_at := old.refused_at;
    elsif new.status = 'refused' then
      new.accepted_at := old.accepted_at;
      new.refused_at := now();
    end if;
    new.inactive_at := old.inactive_at;
    return new;
  end if;

  raise exception 'not allowed to update this coach/student link';
end;
$$;

create or replace function public.validate_workout_write()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'personal' then
    if new.owner_id <> auth.uid() or new.coach_id is not null or new.student_id is not null then
      raise exception 'invalid personal workout ownership';
    end if;
  elsif new.type = 'template' then
    if new.owner_id <> auth.uid() or new.coach_id <> auth.uid() or new.student_id is not null then
      raise exception 'invalid template workout ownership';
    end if;
  elsif new.type = 'student' then
    if new.coach_id <> auth.uid() or new.student_id is null or not public.is_active_coach_for(new.student_id) then
      raise exception 'coach must have an active link with the student';
    end if;
    new.owner_id := new.student_id;
  end if;

  return new;
end;
$$;

create or replace function public.validate_workout_session_write()
returns trigger
language plpgsql
as $$
declare
  workout_row public.workouts%rowtype;
begin
  select * into workout_row from public.workouts where id = new.workout_id;

  if workout_row.id is null then
    raise exception 'workout not found';
  end if;

  if new.student_id <> auth.uid() then
    raise exception 'students can only create their own sessions';
  end if;

  if tg_op = 'UPDATE' then
    if new.student_id <> old.student_id then
      raise exception 'student_id cannot be changed for workout sessions';
    end if;
  end if;

  if workout_row.type = 'personal' and workout_row.owner_id <> auth.uid() then
    raise exception 'cannot execute another user personal workout';
  end if;

  if workout_row.type = 'template' then
    raise exception 'templates cannot be executed directly';
  end if;

  if workout_row.type = 'student' and workout_row.student_id <> auth.uid() then
    raise exception 'cannot execute another student workout';
  end if;

  new.coach_id := workout_row.coach_id;
  return new;
end;
$$;

create or replace function public.validate_performed_set_write()
returns trigger
language plpgsql
as $$
declare
  session_workout_id uuid;
  exercise_workout_id uuid;
  prescribed_exercise_id uuid;
begin
  select workout_id into session_workout_id
  from public.workout_sessions
  where id = new.session_id;

  select workout_id into exercise_workout_id
  from public.workout_exercises
  where id = new.workout_exercise_id;

  if session_workout_id is null or exercise_workout_id is null or session_workout_id <> exercise_workout_id then
    raise exception 'performed set must belong to the executed workout';
  end if;

  if new.prescribed_set_id is not null then
    select workout_exercise_id into prescribed_exercise_id
    from public.prescribed_sets
    where id = new.prescribed_set_id;

    if prescribed_exercise_id is null or prescribed_exercise_id <> new.workout_exercise_id then
      raise exception 'performed set prescription mismatch';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_performed_drop_write()
returns trigger
language plpgsql
as $$
declare
  performed_prescribed_set_id uuid;
  drop_prescribed_set_id uuid;
begin
  if new.prescribed_drop_id is null then
    return new;
  end if;

  select prescribed_set_id into performed_prescribed_set_id
  from public.performed_sets
  where id = new.performed_set_id;

  select prescribed_set_id into drop_prescribed_set_id
  from public.prescribed_drops
  where id = new.prescribed_drop_id;

  if performed_prescribed_set_id is null
    or drop_prescribed_set_id is null
    or performed_prescribed_set_id <> drop_prescribed_set_id then
    raise exception 'performed drop prescription mismatch';
  end if;

  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_coach_students_updated_at
before update on public.coach_students
for each row execute function public.set_updated_at();

create trigger set_exercise_library_updated_at
before update on public.exercise_library
for each row execute function public.set_updated_at();

create trigger set_workouts_updated_at
before update on public.workouts
for each row execute function public.set_updated_at();

create trigger set_workout_exercises_updated_at
before update on public.workout_exercises
for each row execute function public.set_updated_at();

create trigger set_prescribed_sets_updated_at
before update on public.prescribed_sets
for each row execute function public.set_updated_at();

create trigger set_prescribed_drops_updated_at
before update on public.prescribed_drops
for each row execute function public.set_updated_at();

create trigger set_workout_sessions_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create trigger set_performed_sets_updated_at
before update on public.performed_sets
for each row execute function public.set_updated_at();

create trigger set_performed_drops_updated_at
before update on public.performed_drops
for each row execute function public.set_updated_at();

create trigger set_body_records_updated_at
before update on public.body_records
for each row execute function public.set_updated_at();

create trigger validate_coach_students_insert_before
before insert on public.coach_students
for each row execute function public.validate_coach_students_insert();

create trigger validate_coach_students_update_before
before update on public.coach_students
for each row execute function public.validate_coach_students_update();

create trigger validate_workout_write_before
before insert or update on public.workouts
for each row execute function public.validate_workout_write();

create trigger validate_workout_session_write_before
before insert or update on public.workout_sessions
for each row execute function public.validate_workout_session_write();

create trigger validate_performed_set_write_before
before insert or update on public.performed_sets
for each row execute function public.validate_performed_set_write();

create trigger validate_performed_drop_write_before
before insert or update on public.performed_drops
for each row execute function public.validate_performed_drop_write();

alter table public.profiles enable row level security;
alter table public.coach_students enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.prescribed_sets enable row level security;
alter table public.prescribed_drops enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.performed_sets enable row level security;
alter table public.performed_drops enable row level security;
alter table public.body_records enable row level security;

create policy profiles_select_self_or_linked on public.profiles
for select using (
  id = auth.uid()
  or public.has_active_coach_student_link(auth.uid(), id)
);

create policy profiles_insert_self on public.profiles
for insert with check (id = auth.uid());

create policy profiles_update_self on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy coach_students_select_participant_or_invited_email on public.coach_students
for select using (
  coach_id = auth.uid()
  or student_id = auth.uid()
  or (student_id is null and student_email = public.auth_email())
);

create policy coach_students_insert_by_coach on public.coach_students
for insert with check (coach_id = auth.uid());

create policy coach_students_update_by_participant on public.coach_students
for update using (
  coach_id = auth.uid()
  or student_id = auth.uid()
  or (student_id is null and student_email = public.auth_email())
) with check (
  coach_id = auth.uid()
  or student_id = auth.uid()
  or (student_id is null and student_email = public.auth_email())
);

create policy coach_students_delete_by_coach on public.coach_students
for delete using (coach_id = auth.uid());

create policy exercise_library_select_owner on public.exercise_library
for select using (owner_id = auth.uid());

create policy exercise_library_insert_owner on public.exercise_library
for insert with check (owner_id = auth.uid());

create policy exercise_library_update_owner on public.exercise_library
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy exercise_library_delete_owner on public.exercise_library
for delete using (owner_id = auth.uid());

create policy workouts_select_allowed on public.workouts
for select using (public.can_access_workout(id));

create policy workouts_insert_allowed on public.workouts
for insert with check (
  (type = 'personal' and owner_id = auth.uid())
  or (type = 'template' and owner_id = auth.uid() and coach_id = auth.uid())
  or (type = 'student' and coach_id = auth.uid() and public.is_active_coach_for(student_id))
);

create policy workouts_update_prescriber_only on public.workouts
for update using (public.can_edit_prescription(id))
with check (
  (type = 'personal' and owner_id = auth.uid())
  or (type = 'template' and coach_id = auth.uid())
  or (type = 'student' and coach_id = auth.uid() and public.is_active_coach_for(student_id))
);

create policy workouts_delete_prescriber_only on public.workouts
for delete using (public.can_edit_prescription(id));

create policy workout_exercises_select_allowed on public.workout_exercises
for select using (public.can_access_workout(workout_id));

create policy workout_exercises_insert_prescriber_only on public.workout_exercises
for insert with check (public.can_edit_prescription(workout_id));

create policy workout_exercises_update_prescriber_only on public.workout_exercises
for update using (public.can_edit_prescription(workout_id))
with check (public.can_edit_prescription(workout_id));

create policy workout_exercises_delete_prescriber_only on public.workout_exercises
for delete using (public.can_edit_prescription(workout_id));

create policy prescribed_sets_select_allowed on public.prescribed_sets
for select using (public.can_access_workout_exercise(workout_exercise_id));

create policy prescribed_sets_insert_prescriber_only on public.prescribed_sets
for insert with check (public.can_edit_workout_exercise(workout_exercise_id));

create policy prescribed_sets_update_prescriber_only on public.prescribed_sets
for update using (public.can_edit_workout_exercise(workout_exercise_id))
with check (public.can_edit_workout_exercise(workout_exercise_id));

create policy prescribed_sets_delete_prescriber_only on public.prescribed_sets
for delete using (public.can_edit_workout_exercise(workout_exercise_id));

create policy prescribed_drops_select_allowed on public.prescribed_drops
for select using (
  exists (
    select 1
    from public.prescribed_sets ps
    where ps.id = prescribed_set_id
      and public.can_access_workout_exercise(ps.workout_exercise_id)
  )
);

create policy prescribed_drops_insert_prescriber_only on public.prescribed_drops
for insert with check (
  exists (
    select 1
    from public.prescribed_sets ps
    where ps.id = prescribed_set_id
      and public.can_edit_workout_exercise(ps.workout_exercise_id)
  )
);

create policy prescribed_drops_update_prescriber_only on public.prescribed_drops
for update using (
  exists (
    select 1
    from public.prescribed_sets ps
    where ps.id = prescribed_set_id
      and public.can_edit_workout_exercise(ps.workout_exercise_id)
  )
) with check (
  exists (
    select 1
    from public.prescribed_sets ps
    where ps.id = prescribed_set_id
      and public.can_edit_workout_exercise(ps.workout_exercise_id)
  )
);

create policy prescribed_drops_delete_prescriber_only on public.prescribed_drops
for delete using (
  exists (
    select 1
    from public.prescribed_sets ps
    where ps.id = prescribed_set_id
      and public.can_edit_workout_exercise(ps.workout_exercise_id)
  )
);

create policy workout_sessions_select_student_or_active_coach on public.workout_sessions
for select using (
  student_id = auth.uid()
  or (coach_id = auth.uid() and public.is_active_coach_for(student_id))
);

create policy workout_sessions_insert_student on public.workout_sessions
for insert with check (student_id = auth.uid() and public.can_access_workout(workout_id));

create policy workout_sessions_update_student_only on public.workout_sessions
for update using (student_id = auth.uid())
with check (student_id = auth.uid() and public.can_access_workout(workout_id));

create policy workout_sessions_delete_student_only on public.workout_sessions
for delete using (student_id = auth.uid());

create policy performed_sets_select_allowed on public.performed_sets
for select using (public.can_access_session(session_id));

create policy performed_sets_insert_student_only on public.performed_sets
for insert with check (public.can_edit_session_execution(session_id));

create policy performed_sets_update_student_only on public.performed_sets
for update using (public.can_edit_session_execution(session_id))
with check (public.can_edit_session_execution(session_id));

create policy performed_sets_delete_student_only on public.performed_sets
for delete using (public.can_edit_session_execution(session_id));

create policy performed_drops_select_allowed on public.performed_drops
for select using (
  exists (
    select 1
    from public.performed_sets ps
    where ps.id = performed_set_id
      and public.can_access_session(ps.session_id)
  )
);

create policy performed_drops_insert_student_only on public.performed_drops
for insert with check (
  exists (
    select 1
    from public.performed_sets ps
    where ps.id = performed_set_id
      and public.can_edit_session_execution(ps.session_id)
  )
);

create policy performed_drops_update_student_only on public.performed_drops
for update using (
  exists (
    select 1
    from public.performed_sets ps
    where ps.id = performed_set_id
      and public.can_edit_session_execution(ps.session_id)
  )
) with check (
  exists (
    select 1
    from public.performed_sets ps
    where ps.id = performed_set_id
      and public.can_edit_session_execution(ps.session_id)
  )
);

create policy performed_drops_delete_student_only on public.performed_drops
for delete using (
  exists (
    select 1
    from public.performed_sets ps
    where ps.id = performed_set_id
      and public.can_edit_session_execution(ps.session_id)
  )
);

create policy body_records_select_owner_or_active_coach on public.body_records
for select using (
  user_id = auth.uid()
  or public.is_active_coach_for(coalesce(student_id, user_id))
);

create policy body_records_insert_owner on public.body_records
for insert with check (user_id = auth.uid() and coalesce(student_id, user_id) = auth.uid());

create policy body_records_update_owner on public.body_records
for update using (user_id = auth.uid())
with check (user_id = auth.uid() and coalesce(student_id, user_id) = auth.uid());

create policy body_records_delete_owner on public.body_records
for delete using (user_id = auth.uid());
