# 🚀 Supabase Edge Functions - Integração Completa

## O que são Edge Functions?

São funções serverless do Supabase que rodam próximas aos seus usuários. Perfeitas para:
- ✉️ Enviar emails
- 📱 Enviar WhatsApp
- 📅 Sincronizar Google Calendar
- 🔄 Integrar Booking.com
- ⏰ Agendar tarefas automáticas

**Vantagens:**
- ✅ Sem necessidade de backend separado
- ✅ Escalável automaticamente
- ✅ Seguro (sem expor credenciais no frontend)
- ✅ Rápido (CDN global)

---

## 📦 Arquivos

### 1. `send-email/index.ts` - Enviar Emails via Gmail

**O que faz:**
- Envia emails usando Gmail SMTP
- Autentica com App Password
- Loga envios no Supabase

**Como usar:**
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/send-email`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: "hospede@email.com",
      subject: "Confirmação de Reserva",
      html: "<h1>Bem-vindo!</h1>",
      replyTo: "seu@email.com",
    }),
  }
);
```

---

### 2. `send-whatsapp/index.ts` - Enviar WhatsApp via Twilio

**O que faz:**
- Envia mensagens WhatsApp
- Formata números automaticamente (+55)
- Suporta mídia (imagens, PDFs, etc)

**Como usar:**
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/send-whatsapp`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: "11999999999", // ou +5511999999999
      body: "Olá! Sua reserva foi confirmada.",
      mediaUrl: "https://...",
    }),
  }
);
```

---

### 3. `sync-calendar/index.ts` - Sincronizar Google Calendar

**O que faz:**
- Cria eventos no Google Calendar
- Autentica com Google OAuth
- Suporta múltiplos calendários

**Como usar:**
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/sync-calendar`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      event: {
        summary: "Reserva - Quarto 101",
        description: "Check-in 14:00 | Check-out 11:00",
        start: {
          dateTime: "2026-07-20T14:00:00",
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: "2026-07-22T11:00:00",
          timeZone: "America/Sao_Paulo",
        },
        location: "Quarto 101",
        attendees: [{ email: "hospede@email.com" }],
      },
      calendarId: "primary",
      accessToken: "google_oauth_token",
    }),
  }
);
```

---

### 4. `sync-booking-com/index.ts` - Sincronizar Booking.com

**O que faz:**
- Puxa reservas do Booking.com
- Cria automaticamente em `reservations`
- Evita duplicatas

**Como usar:**
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/sync-booking-com`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      propertyId: "123456",
      startDate: "2026-07-10",
      endDate: "2026-08-10",
    }),
  }
);
```

---

### 5. `scheduler/index.ts` - Agendador Automático

**O que faz:**
- Sincroniza Booking.com a cada 6h
- Processa notificações pendentes
- Envia emails e WhatsApp automaticamente

**Como usar (com cron):**
```bash
# Executar a cada 6 horas
0 */6 * * * curl -X POST https://seu-projeto.supabase.co/functions/v1/scheduler
```

---

## 🛠️ Instalação

### Pré-requisitos

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link projeto
supabase link --project-ref seu-projeto-ref
```

### Deploy das Functions

```bash
# Deploy individual
supabase functions deploy send-email
supabase functions deploy send-whatsapp
supabase functions deploy sync-calendar
supabase functions deploy sync-booking-com
supabase functions deploy scheduler

# Ou deploy de todas
supabase functions deploy
```

---

## 🔐 Configurar Variáveis de Ambiente

### 1. Gmail

```bash
supabase secrets set GMAIL_EMAIL=seu_email@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=sua_app_password
```

**Como gerar App Password:**
1. Acesse https://myaccount.google.com/apppasswords
2. Selecione Mail + Windows/Linux
3. Copie a senha de 16 caracteres
4. Use no comando acima

### 2. Twilio WhatsApp

```bash
supabase secrets set TWILIO_ACCOUNT_SID=seu_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=seu_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=whatsapp:+1234567890
```

**Como obter:**
1. Acesse https://www.twilio.com/console
2. Copie Account SID e Auth Token
3. Configure número WhatsApp na seção Messaging

### 3. Google Calendar

```bash
supabase secrets set GOOGLE_CALENDAR_API_KEY=sua_api_key
```

**Como obter:**
1. https://console.cloud.google.com
2. Crie projeto → Ative Google Calendar API
3. Crie chave de API

### 4. Booking.com

```bash
supabase secrets set BOOKING_COM_API_KEY=sua_api_key
supabase secrets set BOOKING_COM_API_URL=https://secure-supply-connect.booking.com/hotels/ota
supabase secrets set BOOKING_PROPERTY_ID=seu_property_id
```

### 5. Supabase (Automático)

```bash
# Já configurado automaticamente pelo Supabase
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

---

## 🧪 Testar Localmente

```bash
# Iniciar servidor local
supabase start

# Testar function
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-email' \
  --header 'Authorization: Bearer seu-token' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "teste@email.com",
    "subject": "Teste",
    "html": "<h1>Olá!</h1>"
  }'
```

---

## ⏰ Agendar Sincronizações Automáticas

### Opção 1: Cron Job (Supabase)

```bash
# Executar scheduler a cada 6 horas
# Vá para: Database → Webhooks → New webhook
# Tipo: Database
# Evento: UPDATE em qualquer tabela
# URL: https://seu-projeto.supabase.co/functions/v1/scheduler
```

### Opção 2: GitHub Actions

Crie `.github/workflows/sync.yml`:

```yaml
name: Sync Integrations
on:
  schedule:
    - cron: '0 */6 * * *' # A cada 6 horas

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scheduler
        run: |
          curl -X POST https://seu-projeto.supabase.co/functions/v1/scheduler \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json"
```

---

## 🐛 Debugging

```bash
# Ver logs em tempo real
supabase functions list
supabase functions logs send-email

# Ver erros
supabase functions logs send-email --limit 50
```

---

## 📊 Monitorar

**No Supabase Dashboard:**
1. Functions → Logs
2. Veja requisições, erros, performance
3. Integre com Sentry para alertas

**Tabela `sync_log`:**
```sql
SELECT * FROM sync_log
WHERE criada_em > NOW() - INTERVAL '1 day'
ORDER BY criada_em DESC;
```

---

## 🎯 Casos de Uso

### 1. Reserva Confirmada
```typescript
// Dispara quando cria reserva
await sendEmail({
  to: hospede.email,
  subject: "Reserva Confirmada",
  html: generateReservationConfirmationEmail(...),
});
await sendWhatsApp({
  to: hospede.telefone,
  body: formatReservationMessage(...),
});
await syncCalendar({
  event: createEvent(...),
  accessToken: googleToken,
});
```

### 2. Sincronização Booking.com
```typescript
// A cada 6 horas
await fetch('scheduler', {
  method: 'POST',
});
// Puxa novas reservas automaticamente
```

### 3. Notificação de Manutenção
```typescript
// Quando inicia manutenção
await sendWhatsApp({
  to: gerente.telefone,
  body: "🔧 Quarto 101 em manutenção até 2026-07-15",
});
```

---

## ✅ Checklist

- [ ] Instalar Supabase CLI
- [ ] Fazer login com `supabase login`
- [ ] Linkar projeto com `supabase link`
- [ ] Copiar 5 arquivos para `supabase/functions/`
- [ ] Configurar variáveis de ambiente
- [ ] Deploy com `supabase functions deploy`
- [ ] Testar cada função
- [ ] Configurar scheduler
- [ ] Monitorar logs
- [ ] Documentar para equipe

---

## 🎨 Problemas Comuns

### ❌ "Permission Denied"
```bash
# Solução: Verificar role das políticas
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### ❌ "Email not sending"
```bash
# Solução: Verificar Gmail App Password
# Ou testar SMTP manualmente
```

### ❌ "WhatsApp timeout"
```bash
# Solução: Verificar credenciais Twilio
# Testar em https://www.twilio.com/console
```

---

## 📞 Suporte

- Docs: https://supabase.com/docs/guides/functions
- Discord: https://discord.supabase.io
- Comunidade: https://github.com/supabase/supabase/discussions
