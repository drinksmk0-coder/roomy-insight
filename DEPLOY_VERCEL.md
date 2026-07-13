# Como corrigir o 404 apos login no Vercel

Este ZIP ja esta corrigido.

## Passos

1. Extraia este projeto.
2. Suba a pasta extraida para o GitHub, substituindo os arquivos antigos.
3. No Vercel, faça redeploy.

## Variaveis obrigatorias no Vercel

Configure em **Project Settings > Environment Variables**:

```txt
VITE_SUPABASE_URL=<url do Supabase>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
SUPABASE_URL=<mesma url do Supabase>
SUPABASE_PUBLISHABLE_KEY=<mesma publishable/anon key>
```

## Supabase Auth

No Supabase, confira:

- Site URL: `https://SEU-DOMINIO.vercel.app`
- Redirect URLs:
  - `https://SEU-DOMINIO.vercel.app`
  - `https://SEU-DOMINIO.vercel.app/auth`
  - `https://SEU-DOMINIO.vercel.app/painel`

## O que foi alterado

- `vercel.json`: fallback para rotas internas.
- `src/routes/auth.tsx`: aguarda sessao antes de ir para `/painel`.
- `src/routes/index.tsx`: usa sessao Supabase para redirecionar.
- `src/routes/_authenticated/route.tsx`: valida sessao antes de validar usuario.
- `src/routes/__root.tsx`: 404/erro em portugues.
