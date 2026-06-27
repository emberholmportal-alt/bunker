# REFUGIO 404 — backend (FASE 1: reloj central)

Backend FastAPI que sirve el **reloj del mundo** del búnker. El frontend lo consulta detrás de
un feature flag (apagado por defecto). Las otras fases (eventos, contadores, despertar) se
construyen después — ver `../BACKEND_ARCHITECTURE.md`.

## Configuración del Web Service en Render

| Opción | Valor |
|---|---|
| Repository | `emberholmportal-alt/bunker` |
| Branch | la branch que estés usando |
| **Root Directory** | `backend` |
| Runtime | Python (autodetectado por `requirements.txt`) |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Plan | Free para probar · Starter ($7) para el vivo 24/7 |

## Variables de entorno (en el dashboard de Render, NO en el código)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | **sí** | la *Internal Database URL* de tu Postgres `beeko-db`. La pegás vos en Render. |
| `LORE_EPOCH_MS` | no | día 0 del lore (ms UTC). Si no se setea, arranca en el día 0 al crear la fila. |
| `ALLOWED_ORIGINS` | no | CORS. Default `*` (read-only público). Se puede restringir al dominio del búnker. |
| `OPERATOR_TOKEN` | no (Fase 5) | si se setea, las escrituras `/op/*` exigen el header `X-Operator-Token`. |

## Endpoints (Fase 1)

- `GET /health` → `{ ok, db }` (no toca la DB; confirma que el servicio levantó).
- `GET /state` → `{ now_ms, day, clock, hour, speed, server_ms }` (el reloj central; el frontend lo lee).
- `POST /op/clock/setDay` `{ "day": 120 }` → fuerza el día.
- `POST /op/clock/setSpeed` `{ "speed": 800 }` → acelera/normaliza el reloj.
- `POST /op/clock/resync` → vuelve al tiempo real (speed 1, sin día forzado).

## Probar local (opcional, con SQLite, sin Postgres)

```
DATABASE_URL=sqlite:///./dev.db uvicorn main:app --port 8000
```
Después: `GET http://localhost:8000/state`.
