-- ============================================================================
-- TROUBLESHOOTING & QUERIES ÚTEIS
-- ============================================================================

-- 1. VERIFICAR STATUS DO BANCO
SELECT version();
SELECT datname, usename, state FROM pg_stat_activity LIMIT 5;

-- 2. LISTAR TODAS AS TABELAS
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 3. VERIFICAR TAMANHO DO BANCO
SELECT pg_size_pretty(pg_database_size(current_database()));

-- 4. QUARTOS SEM RESERVAS (LIVRES)
SELECT DISTINCT r.numero
FROM rooms r
LEFT JOIN reservations res ON r.numero = res.quarto
WHERE res.id IS NULL
ORDER BY r.numero;

-- 5. QUARTOS EM MANUTENÇÃO AGORA
SELECT quarto, status, motivo, data_inicio, data_fim
FROM maintenance_windows
WHERE data_inicio <= CURRENT_DATE 
AND data_fim >= CURRENT_DATE
AND status != 'disponivel'
ORDER BY quarto;

-- 6. SINCRONIZAÇÕES COM ERRO
SELECT i.tipo, s.status, COUNT(*) as total, s.mensagem_erro
FROM sync_log s
JOIN integrations i ON s.integracao_id = i.id
WHERE s.status = 'erro'
GROUP BY i.tipo, s.status, s.mensagem_erro
ORDER BY COUNT(*) DESC;

-- 7. NOTIFICAÇÕES NÃO ENVIADAS
SELECT tipo, COUNT(*) as total, MIN(criada_em) as primeira
FROM notifications
WHERE status IN ('pendente', 'erro')
GROUP BY tipo;

-- 8. USUÁRIOS ATIVOS
SELECT id, email, nome, role, created_at
FROM usuarios
WHERE ativo = true
ORDER BY created_at DESC;

-- 9. CONTAR RESERVAS POR STATUS
SELECT status, COUNT(*) as total
FROM reservations
GROUP BY status;

-- 10. RECEITA POR MÊS
SELECT 
  DATE_TRUNC('month', created_at)::date as mes,
  SUM(valor_total) as receita_total,
  COUNT(*) as num_reservas
FROM reservations
WHERE status NOT IN ('cancelado', 'finalizado')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- 11. QUARTOS MAIS RECLAMADOS
SELECT quarto, COUNT(*) as total_reclamacoes, string_agg(DISTINCT categoria, ', ') as categorias
FROM complaints
WHERE status != 'resolvido'
GROUP BY quarto
ORDER BY total_reclamacoes DESC;

-- 12. MÉDIA DE AVALIAÇÃO
SELECT 
  AVG(nota_geral) as media_geral,
  AVG(nota_limpeza) as media_limpeza,
  AVG(nota_conforto) as media_conforto,
  AVG(nota_atendimento) as media_atendimento,
  COUNT(*) as total_avaliacoes
FROM feedbacks;

-- 13. RESETAR SEQUÊNCIAS (se necessário)
ALTER SEQUENCE rooms_numero_seq RESTART WITH 1;
ALTER SEQUENCE sales_id_seq RESTART WITH 1;

-- 14. EXECUTAR VACUUM & ANALYZE (Manutenção)
VACUUM ANALYZE;
ANALYZE;

-- 15. LOGS DE ERRO (últimas 24 horas)
SELECT 
  sync_log.id,
  integrations.tipo,
  sync_log.mensagem_erro,
  sync_log.criada_em
FROM sync_log
JOIN integrations ON sync_log.integracao_id = integrations.id
WHERE sync_log.status = 'erro'
AND sync_log.criada_em > NOW() - INTERVAL '24 hours'
ORDER BY sync_log.criada_em DESC;

-- ============================================================================
-- PROBLEMAS COMUNS & SOLUÇÕES
-- ============================================================================

/*
❌ PROBLEMA: "permission denied for schema public"
✅ SOLUÇÃO: 
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

❌ PROBLEMA: "row level security violation"
✅ SOLUÇÃO: Verificar policies com SELECT * FROM pg_policies;

❌ PROBLEMA: "database table size exceeds limit"
✅ SOLUÇÃO: Executar VACUUM, remover dados antigos, ou upgrade Supabase

❌ PROBLEMA: "connection timeout"
✅ SOLUÇÃO: Verificar connection pool, aumentar max_connections

❌ PROBLEMA: "duplicate key value violates unique constraint"
✅ SOLUÇÃO: Verificar chaves únicas, usar ON CONFLICT DO UPDATE
*/

-- ============================================================================
-- EXPORTAR DADOS (Backup Manual)
-- ============================================================================

-- Exportar tabela para CSV (via pgAdmin ou terminal)
-- \COPY usuarios TO '/tmp/usuarios.csv' WITH CSV HEADER;
-- \COPY reservations TO '/tmp/reservations.csv' WITH CSV HEADER;

-- ============================================================================
-- IMPORTAR DADOS
-- ============================================================================

-- Importar de CSV
-- \COPY usuarios(email, nome, role, ativo) FROM '/tmp/usuarios.csv' WITH CSV HEADER;
