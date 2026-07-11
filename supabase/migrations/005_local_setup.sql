-- ============================================================================
-- SETUP LOCAL COM DOCKER (Alternativa Segura)
-- ============================================================================

/*
Para máximo de segurança, você pode rodar Supabase localmente com Docker.
Isso deixa TODOS os dados na sua máquina, sem ir para a nuvem.

PASSOS:

1. Instalar Docker:
   https://www.docker.com/products/docker-desktop

2. Clone o repositório Supabase:
   git clone https://github.com/supabase/supabase.git
   cd supabase/docker

3. Inicie os serviços:
   docker-compose up

4. Acesse em: http://localhost:3000
   Email: supabase@example.com
   Senha: password

5. Conecte no seu aplicativo:
   VITE_SUPABASE_URL=http://localhost:3000
   VITE_SUPABASE_ANON_KEY=eyJh... (copie do dashboard)

6. Execute as migrações (001, 002, 003, 004)

VANTAGENS:
✅ Dados 100% locais
✅ Sem limite de armazenamento
✅ Performance melhor
✅ Sem dependência de internet
✅ GDPR compliant
✅ Backup fácil (pasta docker)

DESVANTAGENS:
❌ Precisa de Docker
❌ Sem sincronização automática
❌ Você cuida de backups
*/

-- ============================================================================
-- ARQUIVO: docker-compose.yml (COPIE)
-- ============================================================================

/*
Crie um arquivo chamado docker-compose.yml na pasta do projeto:

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  supabase:
    image: supabase/supabase:latest
    depends_on:
      - postgres
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: postgres
    ports:
      - "3000:3000"
    volumes:
      - ./migrations:/home/supabase/migrations

volumes:
  postgres_data:

Então execute:
docker-compose up -d
*/

-- ============================================================================
-- BACKUP LOCAL DE BANCO DE DADOS
-- ============================================================================

/*
Para fazer backup completo do banco local:

1. VIA DOCKER:
docker-compose exec postgres pg_dump -U postgres postgres > backup.sql

2. VIA TERMINAL (se PostgreSQL instalado localmente):
pg_dump -U postgres -h localhost postgres > backup.sql

3. RESTAURAR DE BACKUP:
psql -U postgres -h localhost postgres < backup.sql

Armazene backups.sql em local seguro (Google Drive, GitHub Private, etc)
*/

-- ============================================================================
-- MONITORAR ESPAÇO EM DISCO
-- ============================================================================

/*
Se usar Docker local, verifique:

docker ps -a
docker stats

Para limpar espaço:
docker system prune  # Remove imagens não usadas
docker volume prune   # Remove volumes não usados
*/

-- ============================================================================
-- MIGRAR DE LOCAL PARA CLOUD (Supabase)
-- ============================================================================

/*
Se começar local e depois quiser ir para Supabase Cloud:

1. Faça backup local:
pg_dump -U postgres -h localhost postgres > backup.sql

2. Crie projeto no Supabase Cloud

3. Execute 001, 002, 003 (migrações) no Supabase Cloud

4. Importe dados (se quiser):
Procure por "Restore from backup" no dashboard

5. Atualize .env.local com URLs do Supabase Cloud
*/
