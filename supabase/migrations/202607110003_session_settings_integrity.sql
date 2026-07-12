-- Corrige a atomicidade do histórico executado e persiste preferências do app.

create table if not exists public.app_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_data_object_check check (jsonb_typeof(data) = 'object')
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_self on public.app_settings;
create policy app_settings_select_self on public.app_settings
for select using (user_id = auth.uid());

drop policy if exists app_settings_insert_self on public.app_settings;
create policy app_settings_insert_self on public.app_settings
for insert with check (user_id = auth.uid());

drop policy if exists app_settings_update_self on public.app_settings;
create policy app_settings_update_self on public.app_settings
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.patch_app_settings(p_patch jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using message = 'Sessão expirada. Entre novamente para salvar as configurações.', errcode = '28000';
  end if;
  p_patch := coalesce(p_patch, '{}'::jsonb);
  if jsonb_typeof(p_patch) <> 'object' then
    raise exception using message = 'Configurações inválidas.', errcode = '22023';
  end if;

  insert into public.app_settings (user_id, data)
  values (v_user_id, p_patch)
  on conflict (user_id) do update
    set data = public.app_settings.data || excluded.data,
        updated_at = now()
  returning data into v_result;

  return v_result;
end;
$$;

revoke all on function public.patch_app_settings(jsonb) from public;
grant execute on function public.patch_app_settings(jsonb) to authenticated;

create or replace function public.save_workout_session_atomic(
  p_session jsonb,
  p_items jsonb default '[]'::jsonb,
  p_snapshot_workout jsonb default null,
  p_snapshot_exercises jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_workout_id uuid;
  v_existing_student_id uuid;
  v_item jsonb;
  v_set jsonb;
  v_drop jsonb;
  v_workout_exercise_id uuid;
  v_performed_set_id uuid;
  v_prescribed_set_id uuid;
  v_prescribed_drop_id uuid;
  v_candidates uuid[];
  v_set_index integer;
  v_drop_index integer;
begin
  if v_user_id is null then
    raise exception using message = 'Sessão expirada. Entre novamente para salvar o treino.', errcode = '28000';
  end if;
  if p_session is null or jsonb_typeof(p_session) <> 'object' then
    raise exception using message = 'Payload da sessão inválido.', errcode = '22023';
  end if;
  p_items := coalesce(p_items, '[]'::jsonb);
  p_snapshot_exercises := coalesce(p_snapshot_exercises, '[]'::jsonb);
  if jsonb_typeof(p_items) <> 'array' or jsonb_typeof(p_snapshot_exercises) <> 'array' then
    raise exception using message = 'Payload dos exercícios executados inválido.', errcode = '22023';
  end if;

  begin
    v_session_id := nullif(trim(p_session ->> 'id'), '')::uuid;
    v_workout_id := nullif(trim(p_session ->> 'workout_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception using message = 'Identificador da sessão ou do treino inválido.', errcode = '22023';
  end;
  v_session_id := coalesce(v_session_id, gen_random_uuid());

  -- Um histórico local/legado pode não ter UUID de treino. Nesse caso, cria o
  -- snapshot e a sessão dentro da mesma transação, sem deixar treino órfão.
  if v_workout_id is null then
    if p_snapshot_workout is null or jsonb_typeof(p_snapshot_workout) <> 'object' then
      raise exception using message = 'Treino da sessão não encontrado e snapshot ausente.', errcode = '22023';
    end if;
    v_workout_id := public.save_workout_atomic(p_snapshot_workout, p_snapshot_exercises);
  end if;

  if not public.can_access_workout(v_workout_id) then
    raise exception using message = 'Você não possui acesso ao treino desta sessão.', errcode = '42501';
  end if;

  select ws.student_id
  into v_existing_student_id
  from public.workout_sessions ws
  where ws.id = v_session_id
  for update;

  if found then
    if v_existing_student_id <> v_user_id then
      raise exception using message = 'Você não possui permissão para alterar esta sessão.', errcode = '42501';
    end if;
    update public.workout_sessions
    set workout_id = v_workout_id,
        coach_id = nullif(trim(p_session ->> 'coach_id'), '')::uuid,
        started_at = coalesce(nullif(trim(p_session ->> 'started_at'), '')::timestamptz, started_at),
        finished_at = nullif(trim(p_session ->> 'finished_at'), '')::timestamptz,
        duration_seconds = coalesce(nullif(p_session ->> 'duration_seconds', '')::integer, 0),
        status = coalesce(nullif(trim(p_session ->> 'status'), ''), 'completed'),
        total_volume = nullif(p_session ->> 'total_volume', '')::numeric,
        completion_percentage = nullif(p_session ->> 'completion_percentage', '')::numeric,
        student_notes = trim(coalesce(p_session ->> 'student_notes', '')),
        updated_at = now()
    where id = v_session_id;
  else
    insert into public.workout_sessions (
      id, workout_id, student_id, coach_id, started_at, finished_at,
      duration_seconds, status, total_volume, completion_percentage, student_notes
    ) values (
      v_session_id,
      v_workout_id,
      v_user_id,
      nullif(trim(p_session ->> 'coach_id'), '')::uuid,
      coalesce(nullif(trim(p_session ->> 'started_at'), '')::timestamptz, now()),
      nullif(trim(p_session ->> 'finished_at'), '')::timestamptz,
      coalesce(nullif(p_session ->> 'duration_seconds', '')::integer, 0),
      coalesce(nullif(trim(p_session ->> 'status'), ''), 'completed'),
      nullif(p_session ->> 'total_volume', '')::numeric,
      nullif(p_session ->> 'completion_percentage', '')::numeric,
      trim(coalesce(p_session ->> 'student_notes', ''))
    );
  end if;

  -- Cascata remove também os drops antigos. Qualquer erro posterior reverte tudo.
  delete from public.performed_sets where session_id = v_session_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_workout_exercise_id := null;
    begin
      v_workout_exercise_id := nullif(trim(v_item ->> 'workout_exercise_id'), '')::uuid;
    exception when invalid_text_representation then
      v_workout_exercise_id := null;
    end;

    if v_workout_exercise_id is not null and not exists (
      select 1 from public.workout_exercises we
      where we.id = v_workout_exercise_id and we.workout_id = v_workout_id
    ) then
      v_workout_exercise_id := null;
    end if;

    if v_workout_exercise_id is null then
      select array_agg(we.id order by we.order_index, we.id)
      into v_candidates
      from public.workout_exercises we
      where we.workout_id = v_workout_id
        and lower(trim(we.name)) = lower(trim(coalesce(v_item ->> 'exercise_name', '')));

      if coalesce(cardinality(v_candidates), 0) <> 1 then
        raise exception using message = format(
          'Não foi possível relacionar de forma única o exercício "%s" à prescrição.',
          trim(coalesce(v_item ->> 'exercise_name', ''))
        ), errcode = '22023';
      end if;
      v_workout_exercise_id := v_candidates[1];
    end if;

    for v_set, v_set_index in
      select value, ordinality::integer
      from jsonb_array_elements(coalesce(v_item -> 'sets', '[]'::jsonb)) with ordinality
    loop
      select ps.id into v_prescribed_set_id
      from public.prescribed_sets ps
      where ps.workout_exercise_id = v_workout_exercise_id
        and ps.set_index = v_set_index;

      begin
        v_performed_set_id := nullif(trim(v_set ->> 'id'), '')::uuid;
      exception when invalid_text_representation then
        v_performed_set_id := null;
      end;
      v_performed_set_id := coalesce(v_performed_set_id, gen_random_uuid());

      insert into public.performed_sets (
        id, session_id, workout_exercise_id, prescribed_set_id, set_index,
        performed_reps, performed_load, completed, rpe, rest_seconds, student_notes
      ) values (
        v_performed_set_id,
        v_session_id,
        v_workout_exercise_id,
        v_prescribed_set_id,
        v_set_index,
        trim(coalesce(v_set ->> 'performed_reps', '')),
        nullif(v_set ->> 'performed_load', '')::numeric,
        coalesce((v_set ->> 'completed')::boolean, false),
        nullif(v_item ->> 'rpe', '')::integer,
        nullif(v_set ->> 'rest_seconds', '')::integer,
        trim(coalesce(v_item ->> 'student_notes', v_set ->> 'student_notes', ''))
      );

      for v_drop, v_drop_index in
        select value, ordinality::integer
        from jsonb_array_elements(coalesce(v_set -> 'drops', '[]'::jsonb)) with ordinality
      loop
        select pd.id into v_prescribed_drop_id
        from public.prescribed_drops pd
        where pd.prescribed_set_id = v_prescribed_set_id
          and pd.drop_index = v_drop_index;

        insert into public.performed_drops (
          id, performed_set_id, prescribed_drop_id, drop_index,
          performed_reps, performed_load, completed
        ) values (
          gen_random_uuid(),
          v_performed_set_id,
          v_prescribed_drop_id,
          v_drop_index,
          trim(coalesce(v_drop ->> 'performed_reps', '')),
          nullif(v_drop ->> 'performed_load', '')::numeric,
          coalesce((v_drop ->> 'completed')::boolean, false)
        );
      end loop;
    end loop;
  end loop;

  return jsonb_build_object('session_id', v_session_id, 'workout_id', v_workout_id);
exception
  when invalid_text_representation or numeric_value_out_of_range or check_violation then
    raise exception using message = 'Há um valor inválido na sessão executada.', errcode = '22023';
end;
$$;

revoke all on function public.save_workout_session_atomic(jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_workout_session_atomic(jsonb, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
