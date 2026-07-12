# Correções transacionais e de conjugados — 11/07/2026

## O que foi corrigido

- O `package-lock.json` usa apenas URLs públicas de `registry.npmjs.org`; não há URLs internas do ambiente OpenAI.
- O `npm ci` foi validado em instalação limpa.
- O tipo do bloco conjugado (`Bi-set`, `Tri-set`, `Supersérie` ou `Circuito`) agora é salvo em `workout_exercises.conjugate_kind` e restaurado ao recarregar.
- Metadados legados de conjugados são migrados para as colunas próprias sem apagar as notas visíveis.
- A assinatura que protege treinos com histórico agora inclui `rest_after_exercise`, `general_notes`, `conjugate_block_id`, `conjugate_position` e `conjugate_kind`. Alterações nesses campos deixam de ser ignoradas silenciosamente.
- A migration remove os nomes conhecidos da FK incorreta e também procura dinamicamente qualquer FK ligada a `conjugate_block_id`, incluindo `workout_exercises_conjugate_block_id_fkey`.
- O salvamento continua atômico pela RPC `save_workout_atomic`.
- Produção sem Supabase continua bloqueada de forma segura.

## Qual SQL executar

- Banco que já recebeu o SQL transacional anterior: execute `supabase/migrations/202607110002_conjugate_integrity_patch.sql`.
- Instalação nova: aplique todas as migrations na ordem descrita em `supabase/README.md`.

O patch é idempotente: pode ser executado mesmo que parte das alterações já exista.

## Validações executadas

- `npm ci --no-audit --no-fund`: aprovado.
- `npm run test:run`: 14 testes aprovados em 4 arquivos.
- `npm run build`: aprovado com 2.195 módulos transformados.
- `npm audit`: 0 vulnerabilidades.
- `package-lock.json`: 0 URLs internas.

## Pontos não bloqueantes

- Recharts 2.15 continua obsoleto e deve ser migrado para a versão 3 em uma rodada visual separada.
- O bundle principal continua com aproximadamente 1,03 MB minificado; o Vite mantém o alerta acima de 500 KB.

## Limitação

O SQL foi revisado estaticamente, mas não foi executado no Supabase de produção. Faça a aplicação pelo SQL Editor antes de publicar o frontend.
