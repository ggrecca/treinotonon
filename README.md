# Treino Tonon

Aplicação web/PWA para gestão e execução de treinos de musculação, com modos Atleta e Treinador.

## Tecnologias

- React + Vite
- Supabase (Auth, PostgreSQL e RLS)
- Vitest
- Vercel para publicação

## Desenvolvimento local

Requer Node.js 20.19+ ou 22.12+.

```bash
npm ci
npm run dev
```

Para conectar ao Supabase, crie um arquivo `.env.local` (ele não deve ser versionado):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

O modo local é exclusivo de desenvolvimento e só é habilitado com `VITE_ENABLE_LOCAL_MODE=true`. Em produção, o app bloqueia o uso sem Supabase configurado.

## Verificações

```bash
npm run test:run
npm run typecheck
npm run build
```

Essas mesmas verificações são executadas no GitHub Actions a cada push e pull request.

## Supabase

As migrations estão em [supabase/migrations](supabase/migrations) e devem ser aplicadas em ordem. Antes de publicar uma mudança que dependa de banco, confirme no SQL Editor do Supabase que as migrations correspondentes já foram executadas.

Nunca use ou publique uma `service_role key` no frontend. O app usa somente a chave pública (`VITE_SUPABASE_PUBLISHABLE_KEY`).

### Recuperação de senha

O frontend envia o usuário de volta para a mesma rota com `?auth=recovery`. No painel do Supabase, configure antes de testar ou publicar:

1. **Authentication → URL Configuration → Site URL** com a URL oficial do app.
2. **Redirect URLs** com as URLs exatas de produção, preview e desenvolvimento que poderão receber `?auth=recovery`.
3. Se o template de recuperação foi customizado, use `{{ .RedirectTo }}` no link em vez de fixar `{{ .SiteURL }}`.
4. Configure SMTP próprio para produção; o serviço padrão do Supabase é destinado apenas a testes e possui limite reduzido.

Esses ajustes são de configuração do Auth e não exigem migration, alteração de schema ou nova policy RLS.

Consulte [supabase/README.md](supabase/README.md) para a ordem das migrations e orientações da versão v10.

## Publicação

1. Rode as verificações acima.
2. Confirme as migrations necessárias no Supabase.
3. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` na Vercel.
4. Faça o deploy.

O diretório `dist/` é gerado pelo build e não deve ser enviado ao repositório.
