# Auditoria Supabase - Treino Tonon v10

## Cliente Supabase

Arquivo:

- `src/services/supabase/client.ts`

Variaveis lidas pelo app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY` como fallback de compatibilidade

Projeto configurado para v10:

- `https://yzpgwoirzmksabzjmoam.supabase.co`

## Banco v10

Migration preparada:

- `supabase/migrations/202607030001_v10_initial_schema.sql`

Tabelas normalizadas criadas pela migration:

- `profiles`
- `coach_students`
- `exercise_library`
- `workouts`
- `workout_exercises`
- `prescribed_sets`
- `prescribed_drops`
- `workout_sessions`
- `performed_sets`
- `performed_drops`
- `body_records`

## RLS

Principios implementados:

- aluno acessa seus proprios dados;
- treinador acessa apenas alunos com vinculo ativo;
- aluno nao edita prescricoes;
- treinador edita prescricoes somente de treinos pessoais, modelos ou alunos ativos;
- execucao fica em tabelas separadas da prescricao;
- treino pessoal, treino de aluno e modelo usam `workouts.type`.

## Etapa 2A - alinhamento cloud

Status:

- Migration revisada, mas nao aplicada no Supabase.
- `src/services/dataService/cloudDataService.ts` adaptado para consumir as tabelas normalizadas da v10.
- Chamadas diretas para tabelas legadas `exercises`, `body_data` e `app_settings` removidas do servico cloud.
- Papeis visiveis padronizados para `athlete` e `coach`.
- Valores antigos `both`, `trainer` e `admin` sao aceitos apenas como compatibilidade de leitura e normalizados para `coach`.

Decisoes:

- Configuracoes visuais/locais do app nao foram persistidas em `app_settings`, pois essa tabela nao faz parte da arquitetura v10 aprovada.
- Prescricao fica em `workouts`, `workout_exercises`, `prescribed_sets` e `prescribed_drops`.
- Execucao fica em `workout_sessions`, `performed_sets` e `performed_drops`.
- Dados corporais ficam em `body_records`.

Correcao de seguranca revisada:

- Treinador cria convite pendente em `coach_students`.
- Somente o aluno convidado pode aceitar ou recusar.
- Treinador pode inativar ou remover vinculo, mas nao ativar pelo aluno.

## Etapa 2B - bloqueadores antes de aplicar SQL

Status:

- Migration revisada, mas ainda nao aplicada no Supabase.
- Sessao cloud separa `workoutKey` visual de `workoutId` real.
- Treino `student` executado pelo aluno precisa chegar com UUID real do treino prescrito; nao pode virar snapshot `personal`.
- Leitura de `body_records` permite dono ou treinador com vinculo ativo, mesmo quando `coach_id` do registro estiver vazio.
- Sugestao automatica de carga removida da v10. O app mostra historico, melhor carga, ultima execucao e RPE, sem recomendar aumento/reducao.
- RPE do exercicio pode ser registrado pelo aluno na execucao e segue para `performed_sets.rpe`.
- Insert de `coach_students` agora e protegido no banco: novo vinculo sempre nasce `pending`, sem `student_id` e sem timestamps de aceite/recusa/inativacao.

Transicoes permitidas em `coach_students`:

- aluno: `pending` -> `active`;
- aluno: `pending` -> `refused`;
- treinador: `active` -> `inactive`;
- treinador: `pending` -> `inactive`, para cancelar convite.

Transicoes bloqueadas:

- aluno reativar vinculo inativo;
- aluno transformar `refused` em `active`;
- treinador transformar `pending` em `active`;
- treinador aceitar convite em nome do aluno.

Configuracoes cloud:

- Ficam locais por enquanto: tema, modo atual, descanso padrao, rascunhos, itens ocultos e ajustes visuais de preferencia.
- Sincronizado agora: perfil, biblioteca de exercicios, treinos, prescricoes, execucoes, vinculos treinador/aluno e dados corporais.
- Recomendacao futura: criar `user_preferences` em etapa propria se a sincronizacao multi-dispositivo dessas preferencias virar requisito.
- A tabela `user_preferences` nao foi criada nesta etapa.

Dados corporais:

- Aluno cadastra e edita os proprios registros.
- Treinador com vinculo ativo pode ler os dados do aluno.
- Cadastro de dados corporais pelo treinador fica para etapa posterior, porque exige uma decisao explicita de produto e novas policies de escrita.

## Etapa 2C - travas finais pre-migration

Status:

- Migration revisada, mas ainda nao aplicada no Supabase.
- `workout_sessions` agora usa `validate_workout_session_write`.
- A validacao roda em `before insert or update`, cobrindo tambem `upsert` que virar `update`.
- Insert e update buscam o treino em `workouts` e bloqueiam execucao de `template`.
- `student_id` precisa ser sempre `auth.uid()`.
- Em update, `student_id` nao pode ser alterado.
- Treino `personal` so pode ser executado pelo proprio `owner_id`.
- Treino `student` so pode ser executado pelo aluno vinculado ao treino.
- `coach_id` da sessao e sempre preenchido a partir do treino, ignorando valor enviado pelo frontend.
- Policy de update de `workout_sessions` continua permitindo apenas o aluno editar a propria execucao, com `with check` reforcado por `public.can_access_workout(workout_id)`.
- `getCurrentUser` no Supabase Auth agora chama `ensureProfile` quando ha usuario autenticado, cobrindo sessao restaurada sem linha em `profiles`.

## Correcao pos-teste - convite treinador/aluno

Diagnostico confirmado:

- O aceite do convite pela UI falhava porque `saveCoachStudent` usava `upsert` em `coach_students`.
- No Supabase/PostgREST, esse caminho podia acionar validacao de insert antes da resolucao de conflito.
- A trigger de insert corretamente exige `coach_id = auth.uid()`, mas no aceite quem esta autenticado e o aluno.

Correcao aplicada:

- Convite de aluno usa metodo especifico com `insert`.
- Aceite de convite usa metodo especifico com `update`.
- Recusa de convite usa metodo especifico com `update`.
- Inativacao/cancelamento pelo treinador usa metodo especifico com `update`.
- `saveCoachStudent` no cloud deixou de executar `upsert` direto e redireciona para as acoes especificas permitidas.
- Nao houve relaxamento de RLS/triggers e nao houve alteracao de migration nesta correcao.
