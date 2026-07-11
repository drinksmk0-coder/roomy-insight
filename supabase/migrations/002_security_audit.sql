-- ============================================================================
-- GUIA DE SEGURANÇA - RLS (Row Level Security)
-- ============================================================================

-- 1. VERIFICAR RLS ATIVADO
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('usuarios', 'maintenance_windows', 'integrations', 'notifications');

-- Resultado esperado: rowsecurity = true para todas

-- ============================================================================
-- 2. VERIFICAR POLÍTICAS
-- ============================================================================

SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
ORDER BY tablename;

-- ============================================================================
-- 3. TESTAR RLS (Como diferentes usuários)
-- ============================================================================

-- Conectar como Admin
SET SESSION authorization 'admin_user_id';
SELECT * FROM usuarios; -- Deve ver todos

-- Conectar como Recepcionista
SET SESSION authorization 'recepcionista_user_id';
SELECT * FROM usuarios; -- Deve ver apenas a si mesmo

-- ============================================================================
-- 4. MONITORAR ACESSOS (Logs)
-- ============================================================================

-- Habilitar logging de queries (PostgreSQL)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = ON;

-- Ver logs (no Supabase: Logs > Query Performance)

-- ============================================================================
-- 5. SENHAS & API KEYS - MELHORES PRÁTICAS
-- ============================================================================

/*
✅ FAZER:
- Usar Supabase Auth para autenticação
- Armazenar API keys em variáveis de ambiente
- Usar JWT tokens com expiração
- Rotacionar chaves regularmente
- Usar HTTPS sempre

❌ NÃO FAZER:
- Colocar senhas em código
- Commitiar .env
- Expor API keys em frontend
- Deixar RLS desativado
- Usar DELETE sem WHERE
*/

-- ============================================================================
-- 6. AUDITORIA - Rastrear Mudanças
-- ============================================================================

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operacao TEXT CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
  usuario_id UUID,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip_address INET,
  user_agent TEXT,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_data ON audit_log(criada_em);

-- Função de auditoria automática
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, operacao, usuario_id, dados_antigos, dados_novos)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoria às tabelas críticas
CREATE TRIGGER audit_usuarios AFTER INSERT OR UPDATE OR DELETE ON usuarios FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_maintenance AFTER INSERT OR UPDATE OR DELETE ON maintenance_windows FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_integrations AFTER INSERT OR UPDATE OR DELETE ON integrations FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Ver auditoria
SELECT * FROM audit_log ORDER BY criada_em DESC LIMIT 20;

-- ============================================================================
-- 7. BACKUP & RECOVERY
-- ============================================================================

/*
Supabase realiza backups automáticos:
- Daily: 7 dias de retenção
- Weekly: 4 semanas de retenção
- Monthly: 12 meses de retenção

Para recuperar: Supabase Dashboard > Backups > Restore
*/

-- ============================================================================
-- 8. LIMPEZA DE DADOS SENSÍVEIS
-- ============================================================================

-- Remover notificações antigas
DELETE FROM notifications 
WHERE criada_em < NOW() - INTERVAL '90 days' 
AND status IN ('enviado', 'erro');

-- Remover logs de sincronização antigos
DELETE FROM sync_log 
WHERE criada_em < NOW() - INTERVAL '30 days';

-- ============================================================================
-- 9. MONITORAMENTO DE PERFORMANCE
-- ============================================================================

-- Queries mais lentas
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 10. POLÍTICA DE RETENÇÃO DE DADOS
-- ============================================================================

/*
📋 Retenção recomendada:
- notifications: 90 dias
- sync_log: 30 dias
- audit_log: 1 ano
- reservations: 5 anos (legal)
- feedbacks: 2 anos
- complaints: 2 anos
*/

-- Criar job de limpeza automática (usar pg_cron)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'DELETE FROM notifications WHERE criada_em < NOW() - INTERVAL ''90 days'' AND status IN (''enviado'', ''erro'')');
