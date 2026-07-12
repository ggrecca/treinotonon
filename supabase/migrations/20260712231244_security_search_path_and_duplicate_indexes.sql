-- Ajustes seguros pós-auditoria: fixa search_path de funções de trigger
-- e remove índices idênticos, sem alterar regras de negócio ou RLS.

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.auth_email() set search_path = public, pg_temp;
alter function public.validate_coach_students_insert() set search_path = public, pg_temp;
alter function public.validate_coach_students_update() set search_path = public, pg_temp;
alter function public.validate_workout_write() set search_path = public, pg_temp;
alter function public.validate_workout_session_write() set search_path = public, pg_temp;
alter function public.validate_performed_set_write() set search_path = public, pg_temp;
alter function public.validate_performed_drop_write() set search_path = public, pg_temp;

-- Mantém uma cópia de cada índice idêntico.
drop index if exists public.body_records_student_id_idx;
drop index if exists public.workout_exercises_conjugate_block_idx;
