-- ============================================================================
-- RESTAURAR BACKUP DO SUPABASE
-- ============================================================================

/*
PASSOS:
1. Acesse Supabase Dashboard > Backups
2. Selecione um backup anterior
3. Clique "Restore"
4. Confirme (isso sobrescreverá o banco atual!)
5. Aguarde 5-10 minutos
6. Teste as conexões

OPÇÃO 2: Usar pg_dump (Command Line)

EXPORTAR:
pg_dump \
  --host db.seu-projeto.supabase.co \
  --port 5432 \
  --username postgres \
  --password \
  --format custom \
  --file backup.dump \
  seu_database

RESTAURAR:
pg_restore \
  --host db.seu-projeto.supabase.co \
  --port 5432 \
  --username postgres \
  --password \
  --no-owner \
  --no-acl \
  backup.dump
*/

-- ============================================================================
-- MIGRATION CHECKLIST
-- ============================================================================

/*
☐ 1. Criar tabelas (001_init_schema.sql)
   - usuarios
   - maintenance_windows
   - integrations
   - sync_log
   - notifications
   - booking_com_sync

☐ 2. Ativar RLS em todas as tabelas

☐ 3. Criar políticas de segurança
   - Admin: acesso total
   - Gerente: acesso operacional
   - Recepcionista: acesso limitado
   - Limpeza: acesso view-only

☐ 4. Adicionar triggers para auditoria (002_security_audit.sql)

☐ 5. Verificar índices para performance

☐ 6. Testar RLS com diferentes roles

☐ 7. Configurar backups automáticos

☐ 8. Documentar políticas de retenção

☐ 9. Treinar equipe no novo sistema

☐ 10. Monitorar performance nas primeiras semanas
*/

-- ============================================================================
-- EXECUTAR MIGRAÇÕES EM ORDEM
-- ============================================================================

/*
NO SUPABASE SQL EDITOR:

1. Abra supabase/migrations/001_init_schema.sql
   Copie todo o conteúdo e execute
   
2. Abra supabase/migrations/002_security_audit.sql
   Copie todo o conteúdo e execute
   
3. Abra supabase/migrations/003_queries_troubleshooting.sql
   Guarde para referência/debugging

OPCIONAL: supabase/migrations/004_backup_restore.sql
   Para recovery em caso de emergência
*/

-- ============================================================================
-- VERIFICAR APÓS MIGRAÇÕES
-- ============================================================================

-- Listar todas as tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Resultado esperado:
-- - audit_log
-- - booking_com_sync
-- - integrations
-- - maintenance_windows
-- - notifications
-- - sync_log
-- - usuarios

-- Contar total de políticas
SELECT COUNT(*) as total_policies FROM pg_policies;

-- Resultado esperado: > 10 policies

-- Verificar triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';

-- Verificar views
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Resultado esperado:
-- - rooms_under_maintenance
-- - recent_sync_activity
-- - pending_notifications_summary
