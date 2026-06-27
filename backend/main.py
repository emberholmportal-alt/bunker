# REFUGIO 404 — backend (FASES 1-2: RELOJ + AGENDA + EVENTOS).
# App FastAPI. Lee la URL de la DB de la env var DATABASE_URL (database.py). Sirve el estado del
# mundo (GET /state: reloj + tramo + evento) y deja al operador ajustarlo (POST /op/*). Un scheduler
# de fondo (asyncio) tira el dado de los eventos. CORS abierto para que el static site lo consulte.
import asyncio
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import engine, SessionLocal, Base
import models
import clock
import events

# Token del operador. Si está VACÍO (default por ahora), las escrituras /op/* quedan ABIERTAS
# (suficiente para probar la Fase 1). La seguridad real (token obligatorio) es la Fase 5: ese
# día sólo hay que setear esta env var en Render, sin tocar código.
OPERATOR_TOKEN = os.environ.get("OPERATOR_TOKEN", "").strip()


def _segment(w, hour):
    # AGENDA: seg_override del operador (NULL=auto · 'off'=deambular) o el tramo según la hora.
    ov = w.seg_override
    if ov is None:
        return clock.segment_for_hour(hour)
    if ov == "off":
        return None  # deambular (el frontend lo lee como null)
    return ov


def _payload(w) -> dict:
    n, day, clk, hour = clock.derive(w)
    now = clock.real_ms()
    kind, ev_start, ev_end, _forced = events.active_event(w, now)  # FASE 2 — EVENTO activo (read-only)
    return {
        "now_ms": n,
        "day": day,
        "clock": clk,
        "hour": round(hour, 5),
        "speed": w.speed,
        "segment": _segment(w, hour),                 # FASE 2 — AGENDA (string o null=deambular)
        "event": kind or "",                          # FASE 2 — EVENTO ('' | 'quake' | 'blackout')
        "event_elapsed_ms": (now - ev_start) if kind else 0,  # cuánto lleva (para sincronizar el arco si te sumás a mitad)
        "event_dur_ms": (ev_end - ev_start) if kind else 0,
        "events_enabled": bool(w.evt_enabled),        # ¿el dado automático del server está prendido?
        "server_ms": now,                             # para que el frontend corrija el drift si quiere
    }


def _get_world(db: Session) -> "models.World":
    w = db.get(models.World, 1)
    if w is None:
        now = clock.real_ms()
        env = os.environ.get("LORE_EPOCH_MS", "").strip()
        epoch = int(env) if env else now  # placeholder: arranca en día 0 (la fecha real de lanzamiento se fija después)
        w = models.World(id=1, lore_epoch_ms=epoch, speed=1, anchor_wall_ms=now, anchor_now_ms=now)
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


def _reanchor(w) -> None:
    # Fija el ancla al 'now' actual → cambiar speed no produce saltos en el reloj.
    w.anchor_now_ms = clock.now_ms(w)
    w.anchor_wall_ms = clock.real_ms()


def _require_op(token: Optional[str]) -> None:
    if OPERATOR_TOKEN and token != OPERATOR_TOKEN:
        raise HTTPException(status_code=401, detail="token de operador inválido")


def _ensure_columns():
    # MIGRACIÓN idempotente (sin terminal): create_all crea tablas NUEVAS (events_log) pero NO agrega
    # columnas a una tabla ya existente. Para la fila `world` que ya existe, agregamos las columnas
    # nuevas con ADD COLUMN IF NOT EXISTS (Postgres). En SQLite (test local) la tabla se crea fresca
    # con las columnas, así que este paso se saltea. Corre solo en el deploy → no se toca nada a mano.
    if engine is None or engine.dialect.name != "postgresql":
        return
    from sqlalchemy import text
    alters = [
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS seg_override VARCHAR",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS evt_next_at_ms BIGINT",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS evt_next_kind VARCHAR",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS evt_enabled BOOLEAN DEFAULT TRUE",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS evt_force_kind VARCHAR",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS evt_force_start_ms BIGINT",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS evt_force_end_ms BIGINT",
    ]
    with engine.begin() as conn:
        for a in alters:
            conn.execute(text(a))


def _advance_events(db: Session):
    # SCHEDULER (lo corre la tarea de fondo cada ~1s): tira el dado, persiste el evento, lo registra
    # en events_log. /state es read-only; ESTA función es la única que muta el estado de eventos.
    w = _get_world(db)
    now = clock.real_ms()
    changed = False
    # 1) FORZADO expirado → registrar + limpiar + reprogramar el auto para después
    if w.evt_force_kind and w.evt_force_end_ms is not None and now >= w.evt_force_end_ms:
        db.add(models.EventLog(kind=w.evt_force_kind, started_at_ms=w.evt_force_start_ms, ended_at_ms=w.evt_force_end_ms, forced=True))
        w.evt_force_kind = None
        w.evt_force_start_ms = None
        w.evt_force_end_ms = None
        w.evt_next_at_ms = now + events.random_gap_ms()
        w.evt_next_kind = events.random_kind()
        changed = True
    force_active = bool(w.evt_force_kind) and w.evt_force_end_ms is not None and now < w.evt_force_end_ms
    # 2) AUTO (sólo si no hay forzado activo y el dado está prendido)
    if not force_active and w.evt_enabled:
        if w.evt_next_at_ms is None or not w.evt_next_kind:
            w.evt_next_at_ms = now + events.random_gap_ms()
            w.evt_next_kind = events.random_kind()
            changed = True
        else:
            end = w.evt_next_at_ms + events.dur_ms(w.evt_next_kind)
            if now >= end:  # el evento auto terminó → registrar (si fue reciente) y programar el próximo
                behind = now - end
                STALE = 2 * events.GAP_MAX_MS  # si quedó MUY atrás (Free estuvo dormido), no spamear el log
                if behind <= STALE:
                    db.add(models.EventLog(kind=w.evt_next_kind, started_at_ms=w.evt_next_at_ms, ended_at_ms=end, forced=False))
                base = end if behind <= STALE else now
                w.evt_next_at_ms = base + events.random_gap_ms()
                w.evt_next_kind = events.random_kind()
                changed = True
    if changed:
        db.commit()


def _advance_once():
    db = SessionLocal()
    try:
        _advance_events(db)
    finally:
        db.close()


async def _scheduler():
    # Tarea de fondo: cada ~1s avanza el dado de eventos. Corre el trabajo de DB en un thread para no
    # bloquear el event loop. Si el servicio estuvo dormido (Free), al despertar se pone al día solo.
    while True:
        try:
            if SessionLocal is not None:
                await asyncio.to_thread(_advance_once)
        except Exception as e:  # nunca tirar abajo el scheduler por un error puntual
            print("[scheduler]", repr(e))
        await asyncio.sleep(1.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas (create_all; Alembic entra cuando el esquema crezca), corre la migración
    # idempotente, siembra la fila singleton, y arranca el scheduler de eventos.
    task = None
    if engine is not None:
        Base.metadata.create_all(bind=engine)
        _ensure_columns()
        db = SessionLocal()
        try:
            _get_world(db)
        finally:
            db.close()
        task = asyncio.create_task(_scheduler())
    yield
    if task is not None:
        task.cancel()


app = FastAPI(title="REFUGIO 404 — backend", version="phase1-clock", lifespan=lifespan)

# CORS: el frontend (static site) está en OTRO dominio → necesita CORS. /state es read-only y
# público, así que por default permitimos cualquier origen. Se puede restringir seteando
# ALLOWED_ORIGINS="https://tu-bunker.onrender.com,https://otro" en Render.
_origins = os.environ.get("ALLOWED_ORIGINS", "*").strip()
_allow = ["*"] if _origins == "*" else [o.strip() for o in _origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def get_db():
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="DATABASE_URL no configurada en el backend")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    # No toca la DB → sirve para confirmar que el servicio levantó.
    return {"ok": True, "service": "refugio-404-backend", "phase": "1-clock", "db": engine is not None}


@app.get("/state")
def get_state(db: Session = Depends(get_db)):
    # El reloj central. El frontend lo lee cada ~4 s.
    return _payload(_get_world(db))


# ---- escrituras del operador (interim; la Fase 5 las protege con OPERATOR_TOKEN obligatorio) ----
class SetDay(BaseModel):
    day: int


class SetSpeed(BaseModel):
    speed: int


@app.post("/op/clock/setDay")
def op_set_day(body: SetDay, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    w.day_override = int(body.day)  # fuerza el día (equivale a streamForce('day'))
    db.commit()
    db.refresh(w)
    return _payload(w)


@app.post("/op/clock/setSpeed")
def op_set_speed(body: SetSpeed, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    _reanchor(w)
    w.speed = max(1, int(body.speed))
    db.commit()
    db.refresh(w)
    return _payload(w)


@app.post("/op/clock/resync")
def op_resync(db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    # Vuelve el reloj al tiempo real (speed=1, sin día forzado) — equivale a streamResync().
    _require_op(x_operator_token)
    w = _get_world(db)
    now = clock.real_ms()
    w.speed = 1
    w.day_override = None
    w.anchor_wall_ms = now
    w.anchor_now_ms = now
    db.commit()
    db.refresh(w)
    return _payload(w)


# ---- FASE 2 — AGENDA: el operador fuerza/libera el tramo de rutina (equivale a OP.forceSegment) ----
class SetSegment(BaseModel):
    # 'ronda'/'carga'/... = forzar ese tramo · 'auto' = liberar (vuelve a la hora) · null = deambular (off)
    segment: Optional[str] = None


@app.post("/op/segment")
def op_set_segment(body: SetSegment, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    seg = body.segment
    if seg == "auto":
        w.seg_override = None    # vuelve a la agenda por hora
    elif seg is None:
        w.seg_override = "off"   # deambula
    else:
        w.seg_override = seg     # fuerza el tramo
    db.commit()
    db.refresh(w)
    return _payload(w)


# ---- FASE 2 — EVENTOS: el operador fuerza un evento o togglea el dado automático ----
class SetEvent(BaseModel):
    kind: str  # 'quake' | 'blackout'


class SetEnabled(BaseModel):
    enabled: bool


@app.post("/op/event")
def op_event(body: SetEvent, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    # Fuerza un evento YA (override). Empieza ahora, dura lo suyo, y el auto se reprograma para después (no se solapan).
    _require_op(x_operator_token)
    if body.kind not in ("quake", "blackout"):
        raise HTTPException(status_code=400, detail="kind debe ser 'quake' o 'blackout'")
    w = _get_world(db)
    now = clock.real_ms()
    w.evt_force_kind = body.kind
    w.evt_force_start_ms = now
    w.evt_force_end_ms = now + events.dur_ms(body.kind)
    w.evt_next_at_ms = w.evt_force_end_ms + events.random_gap_ms()  # el próximo auto, después del forzado
    w.evt_next_kind = events.random_kind()
    db.commit()
    db.refresh(w)
    return _payload(w)


@app.post("/op/events")
def op_events(body: SetEnabled, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    # Prende/apaga el DADO AUTOMÁTICO del server (global). Los forzados manuales siguen funcionando con esto apagado.
    _require_op(x_operator_token)
    w = _get_world(db)
    w.evt_enabled = bool(body.enabled)
    if w.evt_enabled:  # al reactivar, programa el próximo desde ahora
        now = clock.real_ms()
        w.evt_next_at_ms = now + events.random_gap_ms()
        w.evt_next_kind = events.random_kind()
    db.commit()
    db.refresh(w)
    return _payload(w)
