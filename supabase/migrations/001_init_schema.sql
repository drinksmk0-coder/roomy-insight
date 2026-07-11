-- ============================================================================
-- ROOMY INSIGHT - Schema SQL Completo
-- ============================================================================
-- Execute estes comandos NO SUPABASE (SQL Editor)
-- ou localmente se estiver usando Docker
-- ============================================================================

-- ============================================================================
-- 1. TABELA: USUARIOS (Gerenciamento de Acesso)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'gerente', 'recepcionista', 'limpeza')) DEFAULT 'recepcionista',
  ativo BOOLEAN DEFAULT true,
  pousada_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);

-- ============================================================================
-- 2. TABELA: MAINTENANCE_WINDOWS (Status de Manutenção/Limpeza)
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarto INTEGER NOT NULL,
  status TEXT CHECK (status IN ('disponivel', 'manutencao', 'limpeza')) DEFAULT 'disponivel',
  motivo TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (quarto) REFERENCES rooms(numero) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_maintenance_quarto ON maintenance_windows(quarto);
CREATE INDEX idx_maintenance_status ON maintenance_windows(status);
CREATE INDEX idx_maintenance_data ON maintenance_windows(data_inicio, data_fim);

-- ============================================================================
-- 3. TABELA: INTEGRATIONS (Rastreamento de Integrações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN ('google_calendar', 'booking_com', 'whatsapp', 'gmail', 'outro')) NOT NULL,
  status TEXT CHECK (status IN ('ativo', 'inativo', 'erro')) DEFAULT 'inativo',
  config JSONB, -- Armazena: {"calendarId": "...", "email": "...", etc}
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  ultima_erro TEXT,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_integrations_tipo ON integrations(tipo);
CREATE INDEX idx_integrations_status ON integrations(status);

-- ============================================================================
-- 4. TABELA: SYNC_LOG (Auditoria de Sincronizações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'calendar_sync', 'booking_sync', 'email_sent', etc
  status TEXT CHECK (status IN ('sucesso', 'erro', 'pendente')) DEFAULT 'pendente',
  dados JSONB,
  mensagem_erro TEXT,
  duracao_ms INTEGER,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sync_log_integracao ON sync_log(integracao_id);
CREATE INDEX idx_sync_log_tipo ON sync_log(tipo);
CREATE INDEX idx_sync_log_data ON sync_log(criada_em);

-- ============================================================================
-- 5. TABELA: NOTIFICATIONS (Fila de Notificações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN ('email', 'whatsapp', 'calendario')) NOT NULL,
  destino TEXT NOT NULL, -- email ou telefone
  assunto TEXT,
  conteudo TEXT NOT NULL,
  status TEXT CHECK (status IN ('pendente', 'enviado', 'erro')) DEFAULT 'pendente',
  tentativas INTEGER DEFAULT 0,
  proxima_tentativa TIMESTAMP WITH TIME ZONE,
  mensagem_erro TEXT,
  relacionada_a TEXT, -- 'reserva_123', 'reclamacao_456', etc
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enviada_em TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_tipo ON notifications(tipo);
CREATE INDEX idx_notifications_proxima_tentativa ON notifications(proxima_tentativa);

-- ============================================================================
-- 6. TABELA: BOOKING_COM_SYNC (Cache de Reservas do Booking.com)
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_com_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_com_id TEXT UNIQUE NOT NULL,
  reserva_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sincronizado',
  dados_originais JSONB,
  sincronizada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_booking_sync_booking_id ON booking_com_sync(booking_com_id);
CREATE INDEX idx_booking_sync_reserva_id ON booking_com_sync(reserva_id);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) - Segurança por Usuário
-- ============================================================================

-- Ativar RLS nas tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_com_sync ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES - USUARIOS
-- ============================================================================

-- Admin: Ver todos os usuários
CREATE POLICY "admin_view_all_usuarios" ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuários: Ver apenas a si mesmo
CREATE POLICY "users_view_self_usuarios" ON usuarios
  FOR SELECT
  USING (id = auth.uid());

-- Admin: Inserir novos usuários
CREATE POLICY "admin_insert_usuarios" ON usuarios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: Atualizar usuários
CREATE POLICY "admin_update_usuarios" ON usuarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuários: Atualizar apenas dados pessoais
CREATE POLICY "users_update_self_usuarios" ON usuarios
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM usuarios WHERE id = auth.uid())); -- Não pode mudar role

-- ============================================================================
-- POLICIES - MAINTENANCE_WINDOWS
-- ============================================================================

-- Gerente e Admin: Ver tudo
CREATE POLICY "gerente_admin_view_maintenance" ON maintenance_windows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- Limpeza: Ver apenas quartos
CREATE POLICY "limpeza_view_maintenance" ON maintenance_windows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'limpeza'
    )
  );

-- Gerente e Admin: Inserir manutenção
CREATE POLICY "gerente_admin_insert_maintenance" ON maintenance_windows
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- Gerente e Admin: Atualizar manutenção
CREATE POLICY "gerente_admin_update_maintenance" ON maintenance_windows
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- ============================================================================
-- POLICIES - INTEGRATIONS (Apenas Admin)
-- ============================================================================

CREATE POLICY "admin_view_integrations" ON integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_manage_integrations" ON integrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- POLICIES - SYNC_LOG (Apenas Admin)
-- ============================================================================

CREATE POLICY "admin_view_sync_log" ON sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- POLICIES - NOTIFICATIONS
-- ============================================================================

-- Admin: Ver todas as notificações
CREATE POLICY "admin_view_notifications" ON notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Gerente: Ver todas as notificações
CREATE POLICY "gerente_view_notifications" ON notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'gerente'
    )
  );

-- ============================================================================
-- FUNCTIONS - Auditoria Automática
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para usuarios
CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para maintenance_windows
CREATE TRIGGER maintenance_updated_at BEFORE UPDATE ON maintenance_windows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para integrations
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para booking_com_sync
CREATE TRIGGER booking_sync_updated_at BEFORE UPDATE ON booking_com_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTIONS - Lógica de Negócio
-- ============================================================================

-- Função para contar notificações pendentes
CREATE OR REPLACE FUNCTION count_pending_notifications()
RETURNS TABLE(tipo TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT notifications.tipo, COUNT(*)
  FROM notifications
  WHERE status = 'pendente'
  GROUP BY notifications.tipo;
END;
$$ LANGUAGE plpgsql;

-- Função para obter status de um quarto
CREATE OR REPLACE FUNCTION get_room_status(room_numero INTEGER, check_date DATE)
RETURNS TEXT AS $$
DECLARE
  status TEXT;
BEGIN
  -- Verificar se está em manutenção
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM maintenance_windows 
      WHERE quarto = room_numero 
      AND status != 'disponivel'
      AND data_inicio <= check_date 
      AND data_fim >= check_date
    ) THEN 'manutencao'
    ELSE 'ok'
  END INTO status;
  
  RETURN status;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS - Relatórios
-- ============================================================================

-- View: Quartos em Manutenção
CREATE OR REPLACE VIEW rooms_under_maintenance AS
SELECT 
  m.id,
  m.quarto,
  m.status,
  m.motivo,
  m.data_inicio,
  m.data_fim,
  m.responsavel,
  DATEDIFF(day, m.data_inicio, m.data_fim) as dias_duracao,
  CASE 
    WHEN m.data_fim < CURRENT_DATE THEN 'expirado'
    WHEN m.data_inicio <= CURRENT_DATE THEN 'ativo'
    ELSE 'futuro'
  END as situacao
FROM maintenance_windows m
WHERE m.status != 'disponivel'
ORDER BY m.data_inicio DESC;

-- View: Sincronizações Recentes
CREATE OR REPLACE VIEW recent_sync_activity AS
SELECT 
  s.id,
  i.tipo as integracao,
  s.tipo as acao,
  s.status,
  s.duracao_ms,
  s.criada_em,
  CASE 
    WHEN s.status = 'erro' THEN s.mensagem_erro
    ELSE 'OK'
  END as resultado
FROM sync_log s
JOIN integrations i ON s.integracao_id = i.id
ORDER BY s.criada_em DESC
LIMIT 50;

-- View: Notificações por Enviar
CREATE OR REPLACE VIEW pending_notifications_summary AS
SELECT 
  COUNT(*) as total,
  tipo,
  status,
  COUNT(CASE WHEN tentativas > 3 THEN 1 END) as tentativas_excedidas
FROM notifications
WHERE status IN ('pendente', 'erro')
GROUP BY tipo, status;

-- ============================================================================
-- DADOS INICIAIS (Opcional)
-- ============================================================================

-- Inserir usuário admin padrão (MUDE A SENHA!)
-- NOTA: Este usuário será criado via Auth do Supabase
-- Você pode adicionar após criar a autenticação

-- INSERT INTO usuarios (email, nome, role, ativo)
-- VALUES ('admin@pousada.com', 'Administrador', 'admin', true);

-- ============================================================================
-- TESTES DE SEGURANÇA
-- ============================================================================

-- Para testar, execute como diferentes usuários:
-- SET SESSION authorization 'user_id_aqui';
-- SELECT * FROM usuarios;

-- ============================================================================
-- LIMPEZA (Se necessário remover tudo)
-- ============================================================================

/*
DROP TABLE IF EXISTS booking_com_sync CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sync_log CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS maintenance_windows CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS count_pending_notifications();
DROP FUNCTION IF EXISTS get_room_status(INTEGER, DATE);
DROP VIEW IF EXISTS rooms_under_maintenance;
DROP VIEW IF EXISTS recent_sync_activity;
DROP VIEW IF EXISTS pending_notifications_summary;
*/
