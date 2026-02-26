# Portfolio Intelligence Agent

An AI-powered portfolio intelligence platform that provides analysis, insights, and monitoring for investment portfolios.

## Architecture

```
portfolio-intelligence/
├── frontend/          # Next.js web application
├── backend/           # Python FastAPI service
├── infra/             # Infrastructure & configuration
└── docker-compose.yml # Local development orchestration
```

### Frontend — Next.js (TypeScript)

The web interface lives in `frontend/`. It provides:

- Dashboard with portfolio overview and key metrics
- Interactive charts and visualizations
- Natural-language query interface for the intelligence agent
- Real-time updates via server-sent events

Tech: Next.js 14 (App Router), TypeScript, Tailwind CSS.

### Backend — FastAPI (Python)

The API service lives in `backend/`. It provides:

- REST API for portfolio data, analytics, and agent queries
- Background task processing for data ingestion and analysis
- Integration layer for market data providers
- Agent orchestration for intelligence queries

Structure:

```
backend/
├── app/
│   ├── api/        # Route handlers
│   ├── core/       # Configuration, dependencies, middleware
│   ├── models/     # SQLAlchemy ORM models
│   ├── schemas/    # Pydantic request/response schemas
│   └── services/   # Business logic and agent orchestration
├── tests/          # Pytest test suite
├── requirements.txt
└── Dockerfile
```

### Database — PostgreSQL

PostgreSQL stores portfolio holdings, transaction history, market data snapshots, and agent conversation logs. The backend connects via SQLAlchemy with async support (asyncpg).

### Local Development

Prerequisites: Docker, Node.js 20+, Python 3.12+.

```bash
# Start the database
docker compose up -d db

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`, the backend on `http://localhost:8000`, and PostgreSQL on `localhost:5432`.
