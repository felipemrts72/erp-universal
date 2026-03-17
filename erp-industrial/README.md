# ERP Industrial (Monorepo)

## Estrutura
- `backend/`: Node.js + Express + PostgreSQL (`pg`) com camadas controllers/services/repositories.
- `frontend/`: React + Vite + Axios + TailwindCSS.

## Banco de dados
Execute o schema:

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

## Rodar frontend
```bash
cd frontend
npm install
npm run dev
```

## Endpoints principais
- `/api/produtos`
- `/api/estoque`
- `/api/orcamentos`
- `/api/pedidos`
- `/api/producao`
- `/api/relatorios-producao`
- `/api/dashboard`
- `/api/alertas`
