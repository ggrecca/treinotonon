drop policy if exists body_records_select_owner_or_active_coach on public.body_records;
drop policy if exists body_records_insert_owner on public.body_records;
drop policy if exists body_records_update_owner on public.body_records;
drop policy if exists body_records_delete_owner on public.body_records;
drop policy if exists body_records_insert_active_coach on public.body_records;
drop policy if exists body_records_update_active_coach_created on public.body_records;
drop policy if exists body_records_delete_active_coach_created on public.body_records;
drop policy if exists body_records_insert_active_coach_recorded_by on public.body_records;
drop policy if exists body_records_update_active_coach_recorded_by on public.body_records;
drop policy if exists body_records_delete_active_coach_recorded_by on public.body_records;

create policy body_records_select_owner_or_active_coach
on public.body_records
for select
using (
  user_id = auth.uid()
  or student_id = auth.uid()
  or public.is_active_coach_for(coalesce(student_id, user_id))
);

create policy body_records_insert_owner
on public.body_records
for insert
with check (
  user_id = auth.uid()
  and coalesce(student_id, user_id) = auth.uid()
  and (recorded_by is null or recorded_by = auth.uid())
  and (coach_id is null or coach_id = auth.uid())
);

create policy body_records_insert_active_coach
on public.body_records
for insert
with check (
  student_id is not null
  and user_id = student_id
  and recorded_by = auth.uid()
  and coach_id = auth.uid()
  and public.is_active_coach_for(student_id)
);

create policy body_records_update_owner_created
on public.body_records
for update
using (
  user_id = auth.uid()
  and coalesce(recorded_by, user_id) = auth.uid()
  and (coach_id is null or coach_id = auth.uid())
)
with check (
  user_id = auth.uid()
  and coalesce(student_id, user_id) = auth.uid()
  and coalesce(recorded_by, user_id) = auth.uid()
  and (coach_id is null or coach_id = auth.uid())
);

create policy body_records_update_active_coach_created
on public.body_records
for update
using (
  student_id is not null
  and recorded_by = auth.uid()
  and coach_id = auth.uid()
  and public.is_active_coach_for(student_id)
)
with check (
  student_id is not null
  and user_id = student_id
  and recorded_by = auth.uid()
  and coach_id = auth.uid()
  and public.is_active_coach_for(student_id)
);

create policy body_records_delete_owner_created
on public.body_records
for delete
using (
  user_id = auth.uid()
  and coalesce(recorded_by, user_id) = auth.uid()
  and (coach_id is null or coach_id = auth.uid())
);

create policy body_records_delete_active_coach_created
on public.body_records
for delete
using (
  student_id is not null
  and recorded_by = auth.uid()
  and coach_id = auth.uid()
  and public.is_active_coach_for(student_id)
);
