alter table public.body_records
  add column if not exists recorded_by uuid references public.profiles(id) on delete set null,
  add column if not exists sex text,
  add column if not exists weight_kg numeric,
  add column if not exists height_cm numeric,
  add column if not exists body_fat_method text,
  add column if not exists body_fat_calculated numeric,
  add column if not exists body_fat_manual numeric,
  add column if not exists body_fat_final numeric,
  add column if not exists body_density numeric,
  add column if not exists skinfold_sum_mm numeric,
  add column if not exists neck_cm numeric,
  add column if not exists shoulder_cm numeric,
  add column if not exists chest_cm numeric,
  add column if not exists waist_cm numeric,
  add column if not exists abdomen_cm numeric,
  add column if not exists hip_cm numeric,
  add column if not exists arm_cm numeric,
  add column if not exists forearm_cm numeric,
  add column if not exists thigh_cm numeric,
  add column if not exists calf_cm numeric,
  add column if not exists skinfold_chest_mm numeric,
  add column if not exists skinfold_abdominal_mm numeric,
  add column if not exists skinfold_thigh_mm numeric,
  add column if not exists skinfold_triceps_mm numeric,
  add column if not exists skinfold_subscapular_mm numeric,
  add column if not exists skinfold_suprailiac_mm numeric,
  add column if not exists skinfold_midaxillary_mm numeric,
  add column if not exists skinfold_calf_mm numeric,
  add column if not exists measurement_notes text;

create index if not exists body_records_student_id_idx
on public.body_records (student_id, recorded_at desc);

create index if not exists body_records_recorded_by_idx
on public.body_records (recorded_by, recorded_at desc);

create policy body_records_insert_active_coach_recorded_by
on public.body_records
for insert
with check (
  student_id is not null
  and user_id = student_id
  and recorded_by = auth.uid()
  and coach_id = auth.uid()
  and public.is_active_coach_for(student_id)
);

create policy body_records_update_active_coach_recorded_by
on public.body_records
for update
using (
  recorded_by = auth.uid()
  and student_id is not null
  and public.is_active_coach_for(student_id)
)
with check (
  recorded_by = auth.uid()
  and user_id = student_id
  and coach_id = auth.uid()
  and public.is_active_coach_for(student_id)
);

create policy body_records_delete_active_coach_recorded_by
on public.body_records
for delete
using (
  recorded_by = auth.uid()
  and student_id is not null
  and public.is_active_coach_for(student_id)
);
