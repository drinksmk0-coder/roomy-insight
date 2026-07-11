# Migrações SQL para Roomy Insight

Este diretório contém todas as migrações do banco de dados para o Supabase.

## 📋 Arquivos

### 1. `001_init_schema.sql` ⭐ **OBRIGATÓRIO**
Cria todas as tabelas necessárias:
- `usuarios` - Gerenciamento de usuários com roles
- `maintenance_windows` - Status de manutenção dos quartos
- `integrations` - Configuração de integrações externas
- `sync_log` - Histórico de sincronizações
- `notifications` - Fila de notificações
- `booking_com_sync` - Cache de reservas do Booking.com

**Ativa RLS (Row Level Security) em todas as tabelas**

### 2. `002_security_audit.sql` ⭐ **OBRIGATÓRIO**
Adiciona camadas de segurança:
- Tabela `audit_log` - Rastreia todas as mudanças
- Triggers automáticos para auditoria
- Views para relatórios
- Funções de lógica de negócio

### 3. `003_queries_troubleshooting.sql` 📚 **REFERÊNCIA**
Queries úteis para:
- Verificar status do banco
- Debugging de problemas
- Monitoramento de performance
- Soluções para erros comuns

### 4. `004_backup_restore.sql` 🔄 **RECOVERY**
Instruções para:
- Restaurar backups
- Executar migrações em ordem
- Verificar migração bem-sucedida

### 5. `005_local_setup.sql` 🏠 **OPCIONAL**
Guia para rodar Supabase localmente com Docker (máxima segurança)

### `migrate.sh` 🚀 **AUTOMÁTICO**
Script bash para executar todas as migrações de uma vez.

## 🚀 Como Usar

### Opção 1: Supabase Cloud (Mais fácil)

1. Acesse seu projeto em https://app.supabase.com
2. Vá para **SQL Editor**
3. Crie uma nova query
4. Copie e cole o conteúdo de `001_init_schema.sql`
5. Clique em **Run**
6. Repita para `002_security_audit.sql`
7. Pronto! ✅

### Opção 2: Terminal Local

```bash
# Requisito: PostgreSQL instalado

# Tornar script executável
chmod +x supabase/migrate.sh

# Executar migrações
bash supabase/migrate.sh
```

### Opção 3: Docker Local (Máxima Segurança)

Veja `005_local_setup.sql` para instruções completas.

```bash
# Iniciar Supabase localmente
docker-compose up -d

# Executar migrações
psql -h localhost -U postgres -d postgres -f supabase/migrations/001_init_schema.sql
psql -h localhost -U postgres -d postgres -f supabase/migrations/002_security_audit.sql
```

## 📊 Verificar Migração

```bash
# Ver todas as tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

# Ver políticas de segurança
SELECT * FROM pg_policies;

# Ver triggers
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';
```

Resultado esperado: ✅ 7 tabelas, > 10 políticas, 4+ triggers

## 🔐 Segurança

✅ **RLS Ativado**: Cada usuário só vê seus dados
✅ **Auditoria**: Todas as mudanças são registradas
✅ **Backups**: Automáticos em Supabase Cloud
✅ **Encryption**: Todos os dados criptografados

## ⚠️ Importante

- **Nunca** delete a coluna `updated_at`
- **Sempre** respeite as políticas de RLS
- **Faça backup** antes de deletar dados
- **Monitore** performance regularmente

## 📞 Troubleshooting

Veja `003_queries_troubleshooting.sql` para:
- Problemas comuns
- Queries úteis
- Monitoramento
- Limpeza de dados

## 🎯 Checklist após Migrações

- [ ] Executou `001_init_schema.sql`
- [ ] Executou `002_security_audit.sql`
- [ ] Verificou que 7 tabelas foram criadas
- [ ] Testou RLS com usuários diferentes
- [ ] Configurou variáveis de ambiente
- [ ] Fez primeiro backup
- [ ] Documentou senhas em local seguro

## 📚 Documentação

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
