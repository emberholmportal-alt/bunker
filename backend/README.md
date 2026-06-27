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

## Endpoints

- `GET /health` → `{ ok, db }` (no toca la DB; confirma que el servicio levantó).
- `GET /state` → reloj + agenda + evento (lo lee el frontend cada ~4 s):
  `{ now_ms, day, clock, hour, speed, segment, event, event_elapsed_ms, event_dur_ms, events_enabled, server_ms }`.
- **Reloj (Fase 1):** `POST /op/clock/setDay {day}` · `/op/clock/setSpeed {speed}` · `/op/clock/resync`.
- **Agenda (Fase 2-B):** `POST /op/segment {segment}` — `'ronda'|...` fuerza · `'auto'` libera (a la hora) · `null` deambula.
- **Eventos (Fase 2-A):** `POST /op/event {kind:'quake'|'blackout'}` fuerza un evento · `POST /op/events {enabled}` prende/apaga el dado automático.
  Un scheduler de fondo tira el dado (gap 180-360 s) y registra cada evento en `events_log`.
- **Contadores (Fase 3):** `POST /op/counter {counter:'charge'|'bees'|'beesReleased'|'print', value}` ajusta un contador.
  Un ticker de fondo (~1 s) los avanza por dt real según el segment (charge en 'carga', bees/bees_released en 'colmena', print en 'fabricacion'). `bees_released` es persistente (base del despertar, Fase 4).

## Probar local (opcional, con SQLite, sin Postgres)

```
DATABASE_URL=sqlite:///./dev.db uvicorn main:app --port 8000
```
Después: `GET http://localhost:8000/state`.
