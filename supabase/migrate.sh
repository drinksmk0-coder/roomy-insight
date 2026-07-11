#!/bin/bash

# ============================================================================
# SCRIPT: Executar todas as migrações SQL automaticamente
# ============================================================================
# Uso: bash migrate.sh
# ============================================================================

set -e  # Sair se algum comando falhar

echo "🔄 Iniciando migrações do Supabase..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis de conexão
DB_HOST=${SUPABASE_DB_HOST:-localhost}
DB_PORT=${SUPABASE_DB_PORT:-5432}
DB_USER=${SUPABASE_DB_USER:-postgres}
DB_NAME=${SUPABASE_DB_NAME:-postgres}

echo -e "${YELLOW}Banco de dados: $DB_HOST:$DB_PORT/$DB_NAME${NC}"

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql não encontrado. Instale PostgreSQL primeiro.${NC}"
    exit 1
fi

# Executar migrações
echo -e "${YELLOW}📝 Executando 001_init_schema.sql...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f supabase/migrations/001_init_schema.sql
echo -e "${GREEN}✅ Schema criado${NC}"

echo -e "${YELLOW}📝 Executando 002_security_audit.sql...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f supabase/migrations/002_security_audit.sql
echo -e "${GREEN}✅ Segurança e auditoria configuradas${NC}"

echo -e "${YELLOW}🔍 Executando verificações...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f supabase/migrations/003_queries_troubleshooting.sql
echo -e "${GREEN}✅ Verificações concluídas${NC}"

echo -e "${GREEN}\n🎉 Todas as migrações executadas com sucesso!${NC}"
echo -e "${YELLOW}Próximo passo: Revisar supabase/migrations/005_local_setup.sql${NC}"
