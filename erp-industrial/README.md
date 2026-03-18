# ERP Industrial (Monorepo)

## Estrutura
- `backend/`: Node.js + Express + PostgreSQL (`pg`) com camadas controllers/services/repositories.
- `frontend/`: React + Vite + Axios + TailwindCSS.

## Banco de dados
Execute o schema existente (sem alterações estruturais):

```bash
psql "$DATABASE_URL" -f backend/src/database/schema.sql
```

Sem triggers/procedures. Toda regra de negócio fica no backend.

## Rodar backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Endpoints principais (backend)
- `GET /api/estoque`
- `POST /api/estoque/retirada-producao`
- `POST /api/estoque/insumo-extra`
- `POST /api/orcamentos`
- `GET /api/orcamentos/templates`
- `POST /api/pedidos`
- `POST /api/producao/iniciar`
- `POST /api/producao/finalizar`

## Observações de auditoria
- Auditoria de estoque é persistida em arquivo local: `backend/src/data/auditoria_estoque.json`.
- Metadados de orçamento flexível (nome customizado) em: `backend/src/data/orcamento_meta.json`.
