alter table public.body_records
  add column if not exists abdomen numeric,
  add column if not exists calf numeric,
  add column if not exists skinfold_chest numeric,
  add column if not exists skinfold_abdominal numeric,
  add column if not exists skinfold_thigh numeric,
  add column if not exists skinfold_triceps numeric,
  add column if not exists skinfold_subscapular numeric,
  add column if not exists skinfold_suprailiac numeric,
  add column if not exists skinfold_midaxillary numeric,
  add column if not exists skinfold_calf numeric,
  add column if not exists skinfold_notes text;

create policy body_records_insert_active_coach
on public.body_records
for insert
with check (
  coach_id = auth.uid()
  and student_id is not null
  and user_id = student_id
  and public.is_active_coach_for(student_id)
);

create policy body_records_update_active_coach_created
on public.body_records
for update
using (
  coach_id = auth.uid()
  and public.is_active_coach_for(coalesce(student_id, user_id))
)
with check (
  coach_id = auth.uid()
  and student_id is not null
  and user_id = student_id
  and public.is_active_coach_for(student_id)
);

create policy body_records_delete_active_coach_created
on public.body_records
for delete
using (
  coach_id = auth.uid()
  and public.is_active_coach_for(coalesce(student_id, user_id))
);
