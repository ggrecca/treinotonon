# Treino Tonon v10 - Supabase novo

Use um projeto Supabase separado para a v10.

Projeto v10:

- URL: `https://yzpgwoirzmksabzjmoam.supabase.co`
- Chave frontend: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Nao usar service role key no frontend.

Arquivos principais:

- `migrations/202607030001_v10_initial_schema.sql`: schema normalizado da v10 com tabelas, triggers e RLS.
- `migrations/202607050001_add_source_workout_id.sql`: patch da Etapa 4D/4E que adiciona `workouts.source_workout_id` para relacionar treino-base e copias atribuidas.
- `migrations/202607050002_body_records_student_body_patch.sql`: patch da Etapa 4H para campos corporais do aluno e permissao inicial de registro por treinador ativo.
- `migrations/202607050003_body_records_measurements_and_bf.sql`: patch da Etapa 4I para medidas completas, adipometro, BF calculado/manual/final e `recorded_by`.
- `migrations/202607050004_body_records_rls_author_permissions.sql`: patch corretivo da Etapa 4J para impedir que aluno edite/exclua registro corporal criado pelo treinador.
- `migrations/202607100001_workout_metadata.sql`: metadados complementares de treino.
- `migrations/202607100002_workout_exercises_conjugate_blocks.sql`: colunas dos blocos conjugados.
- `migrations/202607110001_save_workout_atomic.sql`: RPC transacional para treino, exercícios, séries e drops.
- `migrations/202607110002_conjugate_integrity_patch.sql`: patch idempotente que persiste o tipo do conjugado, amplia a proteção de histórico e remove qualquer FK incorreta de `conjugate_block_id`.
- `migrations/202607110003_session_settings_integrity.sql`: salvamento transacional de sessões e persistência das configurações na nuvem.
- `migrations/202607110004_publication_integrity_and_set_loads.sql`: bloqueia transferência de treinos existentes, normaliza conjugados legados e atualiza a RPC para a versão de publicação.
- `schema.sql`: aviso de seguranca apontando para a migration v10.
- `V10_AUDIT.md`: auditoria de variaveis, conexao Supabase e pendencias antes do modo cloud completo.

Ordem de aplicacao em projeto Supabase novo:

1. Aplicar `migrations/202607030001_v10_initial_schema.sql`.
2. Aplicar `migrations/202607050001_add_source_workout_id.sql`.
3. Aplicar `migrations/202607050002_body_records_student_body_patch.sql`.
4. Aplicar `migrations/202607050003_body_records_measurements_and_bf.sql`.
5. Aplicar `migrations/202607050004_body_records_rls_author_permissions.sql`.
6. Aplicar `migrations/202607090001_exercise_library_catalog_fields.sql`.
7. Aplicar `migrations/202607090002_exercise_library_equipment_list.sql`.
8. Aplicar `migrations/202607100001_workout_metadata.sql`.
9. Aplicar `migrations/202607100002_workout_exercises_conjugate_blocks.sql`.
10. Aplicar `migrations/202607110001_save_workout_atomic.sql`.
11. Aplicar `migrations/202607110002_conjugate_integrity_patch.sql`.
12. Aplicar `migrations/202607110003_session_settings_integrity.sql`.
13. Aplicar `migrations/202607110004_publication_integrity_and_set_loads.sql`.

Se o banco v10 ja existe com a migration inicial aplicada, nao reaplique a migration inicial inteira. Aplique somente as migrations ainda nao aplicadas, na ordem acima.

Nao aplicar estas migrations no Supabase da versao 9. A v10 usa projeto e schema separados.
Nao usar service role key no frontend.

Observacao sobre dados corporais:

- A migration `202607050002_body_records_student_body_patch.sql` continua necessaria porque o app ainda grava campos de compatibilidade como `abdomen`, `calf`, `skinfold_chest`, `skinfold_abdominal`, `skinfold_thigh`, `skinfold_triceps`, `skinfold_subscapular`, `skinfold_suprailiac`, `skinfold_midaxillary` e `skinfold_calf`.
- A migration `202607050003_body_records_measurements_and_bf.sql` adiciona os campos padronizados em cm/mm e os metadados de BF.
- A migration `202607050004_body_records_rls_author_permissions.sql` recria as policies de `body_records`: aluno visualiza os proprios registros, inclusive os feitos pelo treinador, mas so edita/exclui registros criados por ele; treinador ativo edita/exclui apenas registros que ele criou para aluno vinculado.

Variaveis esperadas pelo app:

```env
VITE_SUPABASE_URL=https://yzpgwoirzmksabzjmoam.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GHM83py65FB0O36uRyNyzw_ciudH6tZ

# Compatibilidade se alguma parte antiga ainda procurar ANON_KEY.
VITE_SUPABASE_ANON_KEY=sb_publishable_GHM83py65FB0O36uRyNyzw_ciudH6tZ
```

Configure essas variaveis localmente e no Vercel usando as chaves do projeto Supabase v10.


## Banco que já recebeu os SQLs 001, 002 e 003

Execute somente `migrations/202607110004_publication_integrity_and_set_loads.sql`. O arquivo é idempotente e não apaga treinos ou históricos.
