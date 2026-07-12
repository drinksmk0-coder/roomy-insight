# 📝 GUIA VISUAL - Setup Passo a Passo

## 🎯 Objetivo Final
Ter o app rodando no Vercel com todas as integrações funcionando.

**Tempo total: ~20 minutos**

---

## 📋 PASSO 1: Clonar Repositório

### Terminal
```bash
git clone https://github.com/drinksmk0-coder/roomy-insight.git
cd roomy-insight
git checkout feature/full-improvements
```

### O que deve aparecer
```
Cloning into 'roomy-insight'...
remote: Enumerating objects: 500+
remote: Counting objects: 100% (500/500)
✓ Cloning done

Branch switched to 'feature/full-improvements'
```

---

## 🔧 PASSO 2: Executar Setup

### Terminal
```bash
bash full-setup.sh
```

### Tela 1: Verificação de Prerequisites
```
╔═══════════════════════════════════════════════════════════════╗
║      🚀 SETUP AUTOMÁTICO - Roomy Insight                    ║
╚═══════════════════════════════════════════════════════════════╝

[1/5] Verificando Prerequisites...
✅ Node.js: v18.17.0
✅ npm: 9.6.7
✅ Git: git version 2.40.0
```

**Se aparecer vermelho (❌):**
- Baixe Node.js em https://nodejs.org/
- Reinstale e tente de novo

### Tela 2: Instalando Dependências
```
[2/5] Instalando Dependências npm...
up to date, audited 250 packages in 1.5s
✅ Dependências instaladas
```

**Pode levar 2-3 minutos**

### Tela 3: Configurar .env.local
```
[3/5] Configurando Variáveis de Ambiente...
⚠️  .env.local não encontrado
Criando arquivo...

📝 Configure as seguintes variáveis em .env.local:
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

**O que fazer:**
1. Abra arquivo `.env.local` (criado na raiz do projeto)
2. Copie suas credenciais Supabase:
   - URL em: https://app.supabase.com → Settings → API
   - Anon Key em: https://app.supabase.com → Settings → API
3. Cole no arquivo:
   ```bash
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_aqui
   ```
4. Salve (Ctrl+S)
5. Pressione ENTER no terminal

### Tela 4: Build e Validação
```
[4/5] Build e Validação...
  → Compilando TypeScript...
✅ Build concluído com sucesso
```

### Tela 5: Sucesso!
```
╔═══════════════════════════════════════════════════════════════╗
║           ✅ SETUP CONCLUÍDO COM SUCESSO!                    ║
╚═══════════════════════════════════════════════════════════════╝

📋 PRÓXIMAS ETAPAS:

1️⃣  EXECUTAR SQL NO SUPABASE
   a) Acesse: https://app.supabase.com
   b) Projeto → SQL Editor → Nova Query
   c) Copie: supabase/migrations/001_init_schema.sql
   d) Click RUN
   e) Repita com: supabase/migrations/002_security_audit.sql

2️⃣  TESTAR LOCALMENTE
   npm run dev
   Acesse: http://localhost:5173

3️⃣  FAZER PUSH E DEPLOY
   git add .
   git commit -m 'feat: complete setup'
   git push origin feature/full-improvements

4️⃣  CONFIGURAR NO VERCEL
   a) Acesse: https://vercel.com/dashboard
   b) Projeto → Settings → Environment Variables
   c) Adicione as mesmas variáveis de .env.local

5️⃣  CRIAR PULL REQUEST
   a) GitHub → Pull Requests → New
   b) Compare: main ← feature/full-improvements
   c) Crie PR, review e merge
```

---

## 🗄️ PASSO 3: Executar SQL no Supabase

### Acessar Supabase
1. Abra https://app.supabase.com
2. Click no seu projeto
3. Menu lateral → **SQL Editor**

### Tela: SQL Editor
```
┌─────────────────────────────────────────┐
│ SQL Editor                              │
├─────────────────────────────────────────┤
│ [+ New Query]  [Favorites]  [Recent]   │
├─────────────────────────────────────────┤
│                                         │
│  SELECT * FROM public.tablename;       │
│                                         │
│                     [Run]  [Save]      │
└─────────────────────────────────────────┘
```

### Copiar SQL 001
1. Abra `supabase/migrations/001_init_schema.sql`
2. Selecione TUDO (Ctrl+A)
3. Copie (Ctrl+C)
4. No Supabase, click "+ New Query"
5. Cole (Ctrl+V)
6. Click **[Run]** ← Verde = sucesso ✅

### Resultado Esperado
```
✅ Query executed successfully
Query execution completed in 234ms
```

### Copiar SQL 002
1. Repita processo com `supabase/migrations/002_security_audit.sql`

---

## 🧪 PASSO 4: Testar Localmente

### Terminal
```bash
npm run dev
```

### Tela: Servidor Rodando
```
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help

Vite dev server running at:
  > Local: http://127.0.0.1:5173/
```

### Abrir no Browser
1. Abra http://localhost:5173
2. Deve aparecer tela de **Login**
3. Teste criar conta (Supabase Auth)
4. Após login: deve aparecer **Painel** com quartos, reservas, etc

### Verificar Funcionalidades
- [ ] Login funciona
- [ ] Painel carrega quartos
- [ ] Aba "Usuários" aparece (admin only)
- [ ] Status "Manutenção" nos quartos
- [ ] Export CSV funciona

**Se algo der errado:**
```bash
# No terminal onde rodou npm run dev, pressione Ctrl+C
bash health-check.sh  # Verifica problemas
```

---

## 📤 PASSO 5: Push para GitHub

### Terminal
```bash
git add .
git commit -m "feat: complete setup and configuration"
git push origin feature/full-improvements
```

### Tela: Push Concluído
```
Enumerating objects: 42, done.
Counting objects: 100% (42/42), done.
Delta compression using up to 8 threads
Compressing objects: 100% (25/25), done.
Writing objects: 100% (42/42), 15.23 KiB | 5.08 MiB/s, done.
Total 42 (delta 8), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (8/8), done.
To github.com:drinksmk0-coder/roomy-insight.git
   d5098b0..2af1397  feature/full-improvements -> feature/full-improvements
```

---

## 🌐 PASSO 6: Configurar Vercel

### Acessar Vercel
1. Abra https://vercel.com/dashboard
2. Selecione seu projeto **roomy-insight**

### Menu: Settings → Environment Variables
```
┌──────────────────────────────────────────────┐
│ Settings                                     │
├──────────────────────────────────────────────┤
│ General                                      │
│ Domains                                      │
│ Environment Variables ← Click aqui          │
│ Analytics                                    │
│ Functions                                    │
│ Edge Config                                  │
└──────────────────────────────────────────────┘
```

### Adicionar Variáveis
1. Click **[+ Add]
2. Preencha:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://seu-projeto.supabase.co
   Production, Preview, Development [selecionados]
   ```
3. Click **[Save]
4. Repita para `VITE_SUPABASE_ANON_KEY`

### Resultado
```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
```

---

## 🔄 PASSO 7: Criar Pull Request

### GitHub.com
1. Acesse seu repositório: https://github.com/drinksmk0-coder/roomy-insight
2. Menu superior → **Pull Requests**
3. Click **[New pull request]

### Tela: Compare Branches
```
base: main                      ← (deixa como está)
compare: feature/full-improvements  ← (mude para isso)

[Create pull request]
```

### Preencher PR
```
Title:
feat: implement complete setup with integrations

Description:
- ✅ User management with RBAC
- ✅ Maintenance status for rooms
- ✅ Email integration (Gmail)
- ✅ WhatsApp integration (Twilio)
- ✅ Google Calendar sync
- ✅ Booking.com sync
- ✅ SQL migrations with RLS
- ✅ Edge Functions
- ✅ Automated setup scripts
- ✅ GitHub Actions CI/CD
- ✅ Monitoring and security

Fixes #X (if applicable)
```

### Click **[Create pull request]

---

## ✅ PASSO 8: Deploy Automático

### GitHub Actions (Automático)
```
Pull Request criada
  ↓
GitHub Actions inicia
  ↓
Build + Type Check + Deploy
  ↓
✅ Deployment preview criada
  ↓
(Merge quando estiver pronto)
  ↓
Vercel deploya para PRODUCTION
  ↓
🎉 App rodando em https://seu-app.vercel.app
```

### Monitorar Deploy
1. No PR: abra aba **Checks**
2. Veja log do GitHub Actions
3. Se ✅ verde: tudo OK
4. Se ❌ vermelho: clique para ver erro

### Após Merge
1. Vercel detecta mudança em `main`
2. Deploy automático inicia
3. ~30-60 segundos depois: produção atualizada

---

## 🎉 SUCESSO!

### App rodando em 3 URLs

```
✅ Local:     http://localhost:5173
✅ Preview:   https://seu-app-[pr].vercel.app (PR only)
✅ Production: https://seu-app.vercel.app (main only)
```

### Testar em Produção
1. Acesse https://seu-app.vercel.app
2. Faça login com Supabase
3. Verifique todas as funcionalidades

---

## 🆘 Troubleshooting

### "Build failed" no Vercel
```
→ Verifique variáveis de ambiente
→ Execute: npm run build localmente
→ Veja logs em Vercel → Deployments → Logs
```

### "Deploy stuck"
```
→ Aguarde 2-3 minutos
→ Se continuar, redeploye manualmente
→ Vercel → Deployments → ... → Redeploy
```

### "App branco no Vercel"
```
→ Abra DevTools (F12)
→ Veja console por erros
→ Verifique VITE_SUPABASE_URL e ANON_KEY
```

---

## 📊 Checklist Final

```
[ ] Setup executado com sucesso
[ ] SQL 001 + 002 rodaram no Supabase
[ ] npm run dev funcionou
[ ] App local aberto em http://localhost:5173
[ ] Login funcionou
[ ] Painel de quartos apareça
[ ] Push para GitHub feito
[ ] Variáveis no Vercel configuradas
[ ] PR criada
[ ] GitHub Actions passou (✅ verde)
[ ] Merge feito em main
[ ] Vercel deploiou automaticamente
[ ] App acessível em produção
[ ] Todas as funcionalidades testadas
```

---

## 🎓 Próximos Passos

- 🧪 Executar testes: `npm run test`
- 📊 Monitorar erros: Sentry integrado
- 🔐 Ativar 2FA: Settings → Security
- 📈 Ver analytics: Vercel dashboard

---

## 💬 Dúvidas?

Se algo não funcionar:
1. Execute `bash health-check.sh`
2. Verifique mensagem de erro
3. Consulte documentação relevante:
   - `SETUP.md` (setup manual)
   - `supabase/migrations/README.md` (SQL)
   - `supabase/functions/README.md` (APIs)

---

**Parabéns! 🎉 Seu app está pronto para produção!**
