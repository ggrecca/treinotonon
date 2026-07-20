-- Lateral body measurements are optional so historical records remain valid.
alter table public.body_records
  add column if not exists arm_right_cm numeric,
  add column if not exists arm_left_cm numeric,
  add column if not exists forearm_right_cm numeric,
  add column if not exists forearm_left_cm numeric,
  add column if not exists thigh_right_cm numeric,
  add column if not exists thigh_left_cm numeric,
  add column if not exists calf_right_cm numeric,
  add column if not exists calf_left_cm numeric;
