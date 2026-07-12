-- Salva o treino e toda a prescrição em uma única transação PostgreSQL.
-- Qualquer erro reverte update/insert, exclusões e recriações.

alter table public.workouts
  add column if not exists source_workout_id uuid references public.workouts(id) on delete set null,
  add column if not exists objective text,
  add column if not exists frequency text,
  add column if not exists weekly_frequency text,
  add column if not exists notes text;

alter table public.workout_exercises
  add column if not exists conjugate_block_id uuid null,
  add column if not exists conjugate_position integer null,
  add column if not exists conjugate_kind text null;

-- Alguns ambientes receberam uma FK incorreta para um identificador que é apenas
-- um agrupador entre exercícios do mesmo treino. Remove nomes conhecidos e qualquer
-- outra FK ligada à coluna, inclusive o nome padrão gerado pelo PostgreSQL.
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

-- Migra metadados legados de conjugados para colunas próprias sem perder notas.
do $backfill_conjugates$
declare
  v_row record;
  v_meta jsonb;
  v_kind text;
  v_block_id uuid;
  v_position integer;
  v_first_line text;
begin
  for v_row in
    select id, general_notes, conjugate_block_id, conjugate_position, conjugate_kind
    from public.workout_exercises
    where conjugate_block_id is not null
       or coalesce(general_notes, '') like '__TREINO_TONON_CONJUGATE__%'
       or coalesce(general_notes, '') like '__CONJUGATE_KIND__:%'
  loop
    v_kind := null;
    v_block_id := null;
    v_position := null;

    if coalesce(v_row.general_notes, '') like '__TREINO_TONON_CONJUGATE__%' then
      v_first_line := split_part(
        substring(v_row.general_notes from char_length('__TREINO_TONON_CONJUGATE__') + 1),
        E'\n',
        1
      );
      begin
        v_meta := v_first_line::jsonb;
        v_kind := nullif(trim(v_meta ->> 'kind'), '');
        v_block_id := nullif(trim(v_meta ->> 'blockId'), '')::uuid;
        v_position := nullif(v_meta ->> 'position', '')::integer;
      exception when others then
        v_meta := null;
        v_kind := null;
        v_block_id := null;
        v_position := null;
      end;
    elsif coalesce(v_row.general_notes, '') like '__CONJUGATE_KIND__:%' then
      v_kind := nullif(trim(split_part(
        substring(v_row.general_notes from char_length('__CONJUGATE_KIND__:') + 1),
        E'\n',
        1
      )), '');
    end if;

    update public.workout_exercises
    set
      conjugate_block_id = coalesce(v_row.conjugate_block_id, v_block_id),
      conjugate_position = coalesce(v_row.conjugate_position, v_position),
      conjugate_kind = coalesce(
        nullif(trim(v_row.conjugate_kind), ''),
        v_kind,
        case when coalesce(v_row.conjugate_block_id, v_block_id) is not null then 'Bi-set' end
      )
    where id = v_row.id;
  end loop;
end
$backfill_conjugates$;

create index if not exists workouts_source_workout_idx
  on public.workouts (source_workout_id);

create index if not exists workout_exercises_workout_conjugate_block_idx
  on public.workout_exercises (workout_id, conjugate_block_id);

alter table public.workout_exercises
  drop constraint if exists workout_exercises_conjugate_position_check;

alter table public.workout_exercises
  add constraint workout_exercises_conjugate_position_check
  check (conjugate_position is null or conjugate_position > 0);

create or replace function public.save_workout_atomic(
  p_workout jsonb,
  p_exercises jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_type text;
  v_owner_id uuid;
  v_coach_id uuid;
  v_student_id uuid;
  v_source_workout_id uuid;
  v_exists boolean := false;
  v_has_history boolean := false;
  v_current_signature jsonb := '[]'::jsonb;
  v_requested_signature jsonb := '[]'::jsonb;
  v_exercise jsonb;
  v_set jsonb;
  v_drop jsonb;
  v_exercise_id uuid;
  v_workout_exercise_id uuid;
  v_prescribed_set_id uuid;
  v_order integer;
begin
  if v_user_id is null then
    raise exception using message = 'Sessão expirada. Entre novamente para salvar o treino.', errcode = '28000';
  end if;

  if p_workout is null or jsonb_typeof(p_workout) <> 'object' then
    raise exception using message = 'Payload do treino inválido.', errcode = '22023';
  end if;

  p_exercises := coalesce(p_exercises, '[]'::jsonb);
  if jsonb_typeof(p_exercises) <> 'array' then
    raise exception using message = 'Payload de exercícios inválido.', errcode = '22023';
  end if;

  begin
    v_workout_id := nullif(trim(p_workout ->> 'id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception using message = 'Identificador do treino inválido.', errcode = '22023';
  end;
  v_workout_id := coalesce(v_workout_id, gen_random_uuid());

  v_type := coalesce(nullif(trim(p_workout ->> 'type'), ''), 'personal');
  if v_type not in ('personal', 'student', 'template') then
    raise exception using message = 'Tipo de treino inválido.', errcode = '22023';
  end if;

  begin
    v_owner_id := nullif(trim(p_workout ->> 'owner_id'), '')::uuid;
    v_coach_id := nullif(trim(p_workout ->> 'coach_id'), '')::uuid;
    v_student_id := nullif(trim(p_workout ->> 'student_id'), '')::uuid;
    v_source_workout_id := nullif(trim(p_workout ->> 'source_workout_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception using message = 'Identificador de proprietário, treinador, aluno ou origem inválido.', errcode = '22023';
  end;

  if v_type = 'personal' then
    v_owner_id := v_user_id;
    v_coach_id := null;
    v_student_id := null;
  elsif v_type = 'template' then
    v_owner_id := v_user_id;
    v_coach_id := v_user_id;
    v_student_id := null;
  else
    if v_student_id is null then
      raise exception using message = 'Aluno não informado para o treino atribuído.', errcode = '22023';
    end if;
    v_owner_id := v_student_id;
    v_coach_id := v_user_id;
  end if;

  -- Serializa edições concorrentes do mesmo treino para evitar gravações perdidas.
  select true
  into v_exists
  from public.workouts w
  where w.id = v_workout_id
  for update;
  v_exists := coalesce(v_exists, false);

  if v_exists and not public.can_edit_prescription(v_workout_id) then
    raise exception using message = 'Você não possui permissão para editar este treino.', errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', lower(trim(coalesce(ex.value ->> 'name', 'Exercicio'))),
      'group', lower(trim(coalesce(ex.value ->> 'muscle_group', 'Outro'))),
      'type', coalesce(nullif(trim(ex.value ->> 'method'), ''), 'normal'),
      'sets', coalesce(nullif(ex.value ->> 'sets', '')::integer, 1),
      'reps', trim(coalesce(ex.value ->> 'reps', '10')),
      'load', nullif(ex.value ->> 'prescribed_load', '')::numeric,
      'rest', nullif(ex.value ->> 'rest_between_sets', '')::integer,
      'rest_after_exercise', nullif(ex.value ->> 'rest_after_exercise', '')::integer,
      'notes', trim(coalesce(ex.value ->> 'coach_notes', '')),
      'general_notes', trim(coalesce(ex.value ->> 'general_notes', '')),
      'conjugate_block_id', nullif(trim(ex.value ->> 'conjugate_block_id'), ''),
      'conjugate_position', nullif(ex.value ->> 'conjugate_position', '')::integer,
      'conjugate_kind', case
        when nullif(trim(ex.value ->> 'conjugate_block_id'), '') is not null
          then coalesce(nullif(trim(ex.value ->> 'conjugate_kind'), ''), 'Bi-set')
        else null
      end,
      'targets', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'reps', trim(coalesce(st.value ->> 'target_reps', '')),
            'load', nullif(st.value ->> 'target_load', '')::numeric,
            'rest', nullif(st.value ->> 'rest_seconds', '')::integer,
            'drops', (
              select coalesce(jsonb_agg(
                jsonb_build_object(
                  'reps', trim(coalesce(dr.value ->> 'target_reps', '')),
                  'load', nullif(dr.value ->> 'target_load', '')::numeric
                ) order by dr.ordinality
              ), '[]'::jsonb)
              from jsonb_array_elements(coalesce(st.value -> 'drops', '[]'::jsonb)) with ordinality dr(value, ordinality)
            )
          ) order by st.ordinality
        ), '[]'::jsonb)
        from jsonb_array_elements(coalesce(ex.value -> 'prescribed_sets', '[]'::jsonb)) with ordinality st(value, ordinality)
      )
    ) order by ex.ordinality
  ), '[]'::jsonb)
  into v_requested_signature
  from jsonb_array_elements(p_exercises) with ordinality ex(value, ordinality);

  if v_exists then
    select exists (
      select 1
      from public.workout_sessions ws
      where ws.workout_id = v_workout_id
    ) or exists (
      select 1
      from public.performed_sets ps
      join public.workout_exercises we on we.id = ps.workout_exercise_id
      where we.workout_id = v_workout_id
    ) into v_has_history;

    if v_has_history then
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'name', lower(trim(coalesce(we.name, 'Exercicio'))),
          'group', lower(trim(coalesce(we.muscle_group, 'Outro'))),
          'type', coalesce(nullif(trim(we.method), ''), 'normal'),
          'sets', coalesce(we.sets, 1),
          'reps', trim(coalesce(we.reps, '10')),
          'load', we.prescribed_load,
          'rest', we.rest_between_sets,
          'rest_after_exercise', we.rest_after_exercise,
          'notes', trim(coalesce(we.coach_notes, '')),
          'general_notes', case
            when coalesce(we.general_notes, '') like '__TREINO_TONON_CONJUGATE__%'
              or coalesce(we.general_notes, '') like '__CONJUGATE_KIND__:%'
              then case
                when position(E'\n' in coalesce(we.general_notes, '')) > 0
                  then trim(substring(we.general_notes from position(E'\n' in we.general_notes) + 1))
                else ''
              end
            else trim(coalesce(we.general_notes, ''))
          end,
          'conjugate_block_id', we.conjugate_block_id::text,
          'conjugate_position', we.conjugate_position,
          'conjugate_kind', case
            when we.conjugate_block_id is not null
              then coalesce(nullif(trim(we.conjugate_kind), ''), 'Bi-set')
            else null
          end,
          'targets', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'reps', trim(coalesce(ps.target_reps, '')),
                'load', ps.target_load,
                'rest', ps.rest_seconds,
                'drops', (
                  select coalesce(jsonb_agg(
                    jsonb_build_object(
                      'reps', trim(coalesce(pd.target_reps, '')),
                      'load', pd.target_load
                    ) order by pd.drop_index
                  ), '[]'::jsonb)
                  from public.prescribed_drops pd
                  where pd.prescribed_set_id = ps.id
                )
              ) order by ps.set_index
            ), '[]'::jsonb)
            from public.prescribed_sets ps
            where ps.workout_exercise_id = we.id
          )
        ) order by we.order_index, we.id
      ), '[]'::jsonb)
      into v_current_signature
      from public.workout_exercises we
      where we.workout_id = v_workout_id;

      if v_current_signature is distinct from v_requested_signature then
        raise exception using
          message = 'Este treino já possui histórico. Duplique o treino ou crie uma nova versão antes de alterar exercícios, séries, repetições, cargas, descansos, notas ou conjugados.',
          errcode = '55000';
      end if;
    end if;

    update public.workouts
    set
      title = coalesce(nullif(trim(p_workout ->> 'title'), ''), 'Treino'),
      description = nullif(trim(p_workout ->> 'description'), ''),
      type = v_type,
      owner_id = v_owner_id,
      coach_id = v_coach_id,
      student_id = v_student_id,
      source_workout_id = v_source_workout_id,
      is_active = coalesce((p_workout ->> 'is_active')::boolean, true),
      objective = nullif(trim(p_workout ->> 'objective'), ''),
      frequency = nullif(trim(p_workout ->> 'frequency'), ''),
      weekly_frequency = nullif(trim(p_workout ->> 'weekly_frequency'), ''),
      notes = nullif(trim(p_workout ->> 'notes'), '')
    where id = v_workout_id;
  else
    insert into public.workouts (
      id, title, description, type, owner_id, coach_id, student_id,
      source_workout_id, is_active, objective, frequency, weekly_frequency, notes
    ) values (
      v_workout_id,
      coalesce(nullif(trim(p_workout ->> 'title'), ''), 'Treino'),
      nullif(trim(p_workout ->> 'description'), ''),
      v_type,
      v_owner_id,
      v_coach_id,
      v_student_id,
      v_source_workout_id,
      coalesce((p_workout ->> 'is_active')::boolean, true),
      nullif(trim(p_workout ->> 'objective'), ''),
      nullif(trim(p_workout ->> 'frequency'), ''),
      nullif(trim(p_workout ->> 'weekly_frequency'), ''),
      nullif(trim(p_workout ->> 'notes'), '')
    );
  end if;

  -- Em treino com histórico e prescrição idêntica, apenas os metadados acima são atualizados.
  if v_has_history then
    return v_workout_id;
  end if;

  delete from public.workout_exercises where workout_id = v_workout_id;

  for v_exercise, v_order in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(p_exercises) with ordinality
  loop
    begin
      v_exercise_id := nullif(trim(v_exercise ->> 'exercise_id'), '')::uuid;
      v_workout_exercise_id := nullif(trim(v_exercise ->> 'id'), '')::uuid;
    exception when invalid_text_representation then
      raise exception using message = 'Identificador de exercício inválido.', errcode = '22023';
    end;
    v_workout_exercise_id := coalesce(v_workout_exercise_id, gen_random_uuid());

    insert into public.workout_exercises (
      id, workout_id, exercise_id, order_index, name, muscle_group, method,
      sets, reps, prescribed_load, rest_between_sets, rest_after_exercise,
      coach_notes, general_notes, conjugate_block_id, conjugate_position, conjugate_kind
    ) values (
      v_workout_exercise_id,
      v_workout_id,
      v_exercise_id,
      coalesce(nullif(v_exercise ->> 'order_index', '')::integer, v_order),
      coalesce(nullif(trim(v_exercise ->> 'name'), ''), 'Exercicio'),
      coalesce(nullif(trim(v_exercise ->> 'muscle_group'), ''), 'Outro'),
      coalesce(nullif(trim(v_exercise ->> 'method'), ''), 'normal'),
      coalesce(nullif(v_exercise ->> 'sets', '')::integer, 1),
      coalesce(nullif(trim(v_exercise ->> 'reps'), ''), '10'),
      nullif(v_exercise ->> 'prescribed_load', '')::numeric,
      nullif(v_exercise ->> 'rest_between_sets', '')::integer,
      nullif(v_exercise ->> 'rest_after_exercise', '')::integer,
      nullif(trim(v_exercise ->> 'coach_notes'), ''),
      nullif(trim(v_exercise ->> 'general_notes'), ''),
      nullif(trim(v_exercise ->> 'conjugate_block_id'), '')::uuid,
      nullif(v_exercise ->> 'conjugate_position', '')::integer,
      nullif(trim(v_exercise ->> 'conjugate_kind'), '')
    );

    for v_set in
      select value
      from jsonb_array_elements(coalesce(v_exercise -> 'prescribed_sets', '[]'::jsonb))
      order by coalesce(nullif(value ->> 'set_index', '')::integer, 1)
    loop
      begin
        v_prescribed_set_id := nullif(trim(v_set ->> 'id'), '')::uuid;
      exception when invalid_text_representation then
        raise exception using message = 'Identificador de série prescrita inválido.', errcode = '22023';
      end;
      v_prescribed_set_id := coalesce(v_prescribed_set_id, gen_random_uuid());

      insert into public.prescribed_sets (
        id, workout_exercise_id, set_index, target_reps, target_load, rest_seconds, notes
      ) values (
        v_prescribed_set_id,
        v_workout_exercise_id,
        coalesce(nullif(v_set ->> 'set_index', '')::integer, 1),
        nullif(trim(v_set ->> 'target_reps'), ''),
        nullif(v_set ->> 'target_load', '')::numeric,
        nullif(v_set ->> 'rest_seconds', '')::integer,
        nullif(trim(v_set ->> 'notes'), '')
      );

      for v_drop in
        select value
        from jsonb_array_elements(coalesce(v_set -> 'drops', '[]'::jsonb))
        order by coalesce(nullif(value ->> 'drop_index', '')::integer, 1)
      loop
        insert into public.prescribed_drops (
          prescribed_set_id, drop_index, target_reps, target_load, notes
        ) values (
          v_prescribed_set_id,
          coalesce(nullif(v_drop ->> 'drop_index', '')::integer, 1),
          nullif(trim(v_drop ->> 'target_reps'), ''),
          nullif(v_drop ->> 'target_load', '')::numeric,
          nullif(trim(v_drop ->> 'notes'), '')
        );
      end loop;
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

revoke all on function public.save_workout_atomic(jsonb, jsonb) from public;
revoke all on function public.save_workout_atomic(jsonb, jsonb) from anon;
grant execute on function public.save_workout_atomic(jsonb, jsonb) to authenticated;

comment on function public.save_workout_atomic(jsonb, jsonb)
is 'Salva treino, exercícios, séries e drops atomicamente, preservando histórico executado.';

notify pgrst, 'reload schema';
