# 🚀 Setup Completo - Roomy Insight

## 📋 Pré-requisitos

- Node.js 18+
- Supabase account (https://supabase.com)
- Google Cloud Console account (para Google Calendar)
- Vercel account (para deploy)

---

## 1️⃣ Configuração do Banco de Dados (Supabase)

### Criar tabelas necessárias:

```sql
-- Usuários com RBAC
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'gerente', 'recepcionista', 'limpeza')) DEFAULT 'recepcionista',
  ativo BOOLEAN DEFAULT true,
  pousada_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Janelas de Manutenção
CREATE TABLE maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarto INTEGER NOT NULL,
  status TEXT CHECK (status IN ('disponivel', 'manutencao', 'limpeza')) DEFAULT 'disponivel',
  motivo TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (quarto) REFERENCES rooms(numero)
);

-- Integrações
CREATE TABLE integrações (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN ('google_calendar', 'booking_com', 'whatsapp', 'gmail')) NOT NULL,
  status TEXT DEFAULT 'inativo',
  config JSONB,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2️⃣ Variáveis de Ambiente

Crie um `.env.local` com base em `.env.example`:

```bash
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key

# Google Calendar
VITE_GOOGLE_CALENDAR_API_KEY=sua_api_key
VITE_GOOGLE_CLIENT_ID=seu_client_id
VITE_GOOGLE_CLIENT_SECRET=seu_client_secret

# Booking.com
VITE_BOOKING_COM_API_KEY=sua_api_key
VITE_BOOKING_COM_API_URL=https://secure-supply-connect.booking.com/hotels/ota

# WhatsApp (Twilio)
VITE_WHATSAPP_API_KEY=sua_api_key
VITE_WHATSAPP_ACCOUNT_SID=seu_account_sid
VITE_WHATSAPP_PHONE_NUMBER=+5511999999999
```

---

## 3️⃣ Google Calendar Setup

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto
3. Ative a API de Google Calendar
4. Crie uma chave de API
5. Configure OAuth 2.0 credentials
6. Copie as credenciais para `.env.local`

---

## 4️⃣ Booking.com Setup

1. Acesse https://partner.booking.com
2. Solicite acesso à API
3. Configure as credenciais
4. Copie a API key para `.env.local`

---

## 5️⃣ WhatsApp Setup (Twilio)

1. Crie uma conta em https://www.twilio.com
2. Configure um número WhatsApp
3. Copie Account SID e Auth Token
4. Configure em `.env.local`

---

## 6️⃣ Instalação Local

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview de produção
npm run preview
```

---

## 7️⃣ Deploy no Vercel

### Via CLI:

```bash
npm i -g vercel
vercel
```

### Via GitHub:

1. Push para GitHub
2. Conecte o repositório no Vercel
3. Configure as variáveis de ambiente em Project Settings > Environment Variables
4. Deploy automático em cada push

---

## 🔐 Segurança

- ✅ Nunca commite `.env.local`
- ✅ Use variáveis de ambiente no Vercel
- ✅ Ative RLS (Row Level Security) no Supabase
- ✅ Configure CORS corretamente
- ✅ Valide e sanitize inputs

---

## 📊 Features Implementadas

- ✅ Sistema de permissões por cargo (RBAC)
- ✅ Cadastro de usuários
- ✅ Status de manutenção para quartos
- ✅ Google Calendar Sync
- ✅ Gmail notifications
- ✅ WhatsApp messaging
- ✅ Booking.com API integration
- ✅ Export CSV (já existia)
- ✅ Fix 404 no Vercel

---

## 🐛 Troubleshooting

### "Página não encontrada" no Vercel

- Verifique se `vercel.json` está na raiz
- Confirme o build output em `.output/public`
- Teste localmente com `npm run build && npm run preview`

### Google Calendar não sincroniza

- Valide a API key em https://console.cloud.google.com
- Confirme que o calendarId está correto
- Verifique os logs no navegador (F12)

### WhatsApp não envia mensagens

- Verifique Twilio credentials
- Confirme que o número tem acesso WhatsApp
- Teste em https://www.twilio.com/console

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
