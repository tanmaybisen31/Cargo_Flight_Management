# Cargo Route & Load Planning POC

A proof-of-concept platform for airline cargo route planning and space optimisation across the Ranchi ⇄ Delhi ⇄ Bengaluru ⇄ Dubai network. The solution couples a Python/FastAPI optimisation backend with a React/Material UI frontend.

## Project Structure

- `backend/` – FastAPI service, optimisation logic, GA routing + knapsack modules.
- `data/` – Sample CSV datasets for flights, cargo, and connection rules.
- `frontend/` – Vite/React dashboard for revenue managers.
- `outputs/` – Generated CSV/JSON artefacts when persistence is enabled.

## Backend Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.api:app --reload --port 8000
```

### CLI Runner

Execute a one-off plan (without writing artefacts):

```bash
python3 -m backend.main --data data --output outputs --no-write
```

Pass a JSON file describing disruption events via `--events path/to/events.json` to evaluate scenarios.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000` (configure in `vite.config.ts`).

## API Overview

- `POST /plan/sample` – runs the baseline scenario using bundled data (no persistence).
- `POST /plan/run` – accepts an array of disruption events and optional seed/output flags.
- `GET /health` – service heartbeat.

Refer to `frontend/src/api/types.ts` for the exact request/response contracts consumed by the UI.

## Disruption Events Schema

```json
{
  "event_type": "delay | cancel | swap",
  "flight_id": "AI301",
  "delay_minutes": 90,
  "new_weight_capacity_kg": 15000,
  "new_volume_capacity_m3": 110
}
```

All fields other than `event_type` and `flight_id` are optional. Mix and match events to explore combined disruptions.

## Next Steps

- Harden GA and knapsack heuristics with unit tests and profiling.
- Persist scenario histories for comparison in the UI.
- Enhance the frontend with interactive charts (maps/time series) once live data integration is available.
