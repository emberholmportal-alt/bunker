# REFUGIO 404 — backend (FASES 1-2: RELOJ + AGENDA + EVENTOS).
# App FastAPI. Lee la URL de la DB de la env var DATABASE_URL (database.py). Sirve el estado del
# mundo (GET /state: reloj + tramo + evento) y deja al operador ajustarlo (POST /op/*). Un scheduler
# de fondo (asyncio) tira el dado de los eventos. CORS abierto para que el static site lo consulte.
import asyncio
import os
import secrets
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import engine, SessionLocal, Base
import models
import clock
import events
import counters
import awakening

# ===== FASE 5 — SEGURIDAD DEL BACKEND =====
# Token del operador. FAIL-CLOSED: si esta env var NO está seteada en el servidor, TODAS las escrituras
# /op/* quedan DENEGADAS (403) para todos. Para habilitar el control de operador hay que setear
# OPERATOR_TOKEN en Render con un secreto fuerte. Las lecturas (/state, /health) son públicas igual.
OPERATOR_TOKEN = os.environ.get("OPERATOR_TOKEN", "").strip()

# Límites de validación de inputs del operador (defensa en profundidad: ni un atacante ni un typo
# pueden corromper la DB o el despertar con valores absurdos).
DAY_MAX = 1_000_000           # ~2740 años de días; techo anti-overflow/absurdo (day siempre ≥ 0)
SPEED_MAX = 100_000           # speed siempre ≥ 1; techo razonable de aceleración de testeo
COUNTER_BOUNDS = {            # rangos sanos por contador (clamp, no rechazo: el operador no rompe nada)
    "charge": (0.0, 100.0),                  # medidor 0..100
    "bees": (0.0, counters.BEE_CAP),         # cría 0..BEE_CAP(60)
    "beesReleased": (0.0, 1_000_000.0),      # ~10 años de liberaciones; cap que el awakening (asintótico) ya satura sin corromper
    "print": (0.0, 100.0),                   # progreso 0..100
}
# Tramos válidos para /op/segment (whitelist; no se aceptan strings crudos arbitrarios).
# Además se aceptan 'auto' (volver a la agenda por hora) y null (deambular/off), que maneja op_set_segment.
VALID_SEGMENTS = {"carga", "colmena", "admin", "fabricacion", "ronda", "ocio"}


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


# ---- RATE LIMITING (slowapi). Detrás del proxy de Render usamos el 1er IP de X-Forwarded-For como
#      clave (si no, todos compartirían el IP del proxy). Lecturas: límite suave; escrituras: estricto. ----
def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
RL_STATE = "90/minute"   # /state: el frontend poll cada ~4s (~15/min/pestaña) → ~6 pestañas/IP antes de cortar
RL_OP = "20/minute"      # /op/*: las acciones de operador son infrecuentes → 20/min sobra y frena el spam


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
        "charge": round(w.charge or 0.0, 3),          # FASE 3 — CONTADORES (los avanza el ticker)
        "bees": round(w.bees or 0.0, 3),
        "bees_released": round(w.bees_released or 0.0, 3),
        "print": round(w.print_progress or 0.0, 3),
        "awakening_progress": round(_awakening_progress(w), 5),  # FASE 4 — EL DESPERTAR (0..1, derivado de bees_released o el override)
        "awakening_stage": awakening.stage_for(_awakening_progress(w)),
        "server_ms": now,                             # para que el frontend corrija el drift si quiere
    }


def _awakening_progress(w) -> float:
    ov = w.awakening_override
    p = ov if ov is not None else awakening.progress_for(w.bees_released or 0.0)
    return max(0.0, min(1.0, p))


def _get_world(db: Session) -> "models.World":
    w = db.get(models.World, 1)
    if w is None:
        now = clock.real_ms()
        env = os.environ.get("LORE_EPOCH_MS", "").strip()
        epoch = int(env) if env else now  # placeholder: arranca en día 0 (la fecha real de lanzamiento se fija después)
        w = models.World(id=1, lore_epoch_ms=epoch, speed=1, anchor_wall_ms=now, anchor_now_ms=now,
                         charge=0.0, bees=0.0, bees_released=0.0, print_progress=0.0, cnt_tick_ms=now)
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


def _reanchor(w) -> None:
    # Fija el ancla al 'now' actual → cambiar speed no produce saltos en el reloj.
    w.anchor_now_ms = clock.now_ms(w)
    w.anchor_wall_ms = clock.real_ms()


def _require_op(token: Optional[str]) -> None:
    # FAIL-CLOSED: sin OPERATOR_TOKEN configurado en el server → todo denegado (403). Con token
    # configurado → exige que coincida (comparación de tiempo constante contra timing attacks).
    if not OPERATOR_TOKEN:
        raise HTTPException(status_code=403, detail="control de operador deshabilitado: el servidor no tiene OPERATOR_TOKEN configurado")
    if not token or not secrets.compare_digest(token, OPERATOR_TOKEN):
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
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS charge DOUBLE PRECISION DEFAULT 0",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS bees DOUBLE PRECISION DEFAULT 0",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS bees_released DOUBLE PRECISION DEFAULT 0",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS print_progress DOUBLE PRECISION DEFAULT 0",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS cnt_tick_ms BIGINT",
        "ALTER TABLE world ADD COLUMN IF NOT EXISTS awakening_override DOUBLE PRECISION",
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


def _advance_counters(db: Session):
    # TICKER de contadores (lo corre la tarea de fondo cada ~1s): avanza charge/bees/bees_released/print
    # por dt REAL (capeado) según el segment del server. /state los LEE; ESTA función es la única que los muta.
    w = _get_world(db)
    now = clock.real_ms()
    if w.charge is None: w.charge = 0.0          # filas viejas (tras el ALTER pueden venir NULL)
    if w.bees is None: w.bees = 0.0
    if w.bees_released is None: w.bees_released = 0.0
    if w.print_progress is None: w.print_progress = 0.0
    if w.cnt_tick_ms is None:
        w.cnt_tick_ms = now  # primer tick: sólo anclar
        db.commit()
        return
    dt = (now - w.cnt_tick_ms) / 1000.0
    if dt <= 0:
        return
    dt = min(dt, counters.DT_CAP)  # capear (sleep del Free)
    _, _, _, hour = clock.derive(w)
    seg = _segment(w, hour)        # mismo segment que /state (respeta seg_override)
    w.charge, w.bees, w.bees_released, w.print_progress = counters.advance(
        w.charge, w.bees, w.bees_released, w.print_progress, seg, dt)
    w.cnt_tick_ms = now
    db.commit()


def _advance_once():
    db = SessionLocal()
    try:
        _advance_events(db)
        _advance_counters(db)
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


app = FastAPI(title="REFUGIO 404 — backend", version="phase5-security", lifespan=lifespan)

# RATE LIMITING: registra el limiter y el handler 429. Los límites concretos van por-ruta (@limiter.limit).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: el frontend (static site) está en OTRO dominio → el navegador del site necesita CORS para leer /state.
# Seteá ALLOWED_ORIGINS="https://bunker-bx8y.onrender.com" en Render para restringir el origen (recomendado).
# Nota: CORS es un control del NAVEGADOR (no afecta curl/monitores server-side), así que /state sigue siendo
# consultable por no-navegadores aunque restrinjas el origen. La protección REAL de /op/* es el OPERATOR_TOKEN.
# Default '*' (no rompe nada si la env var falta); la whitelist se activa al setearla.
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
@limiter.limit(RL_STATE)
def get_state(request: Request, db: Session = Depends(get_db)):
    # El reloj central. El frontend lo lee cada ~4 s. Público (read-only); rate-limit suave anti-flood.
    return _payload(_get_world(db))


# ---- escrituras del operador (interim; la Fase 5 las protege con OPERATOR_TOKEN obligatorio) ----
class SetDay(BaseModel):
    day: int


class SetSpeed(BaseModel):
    speed: int


@app.post("/op/clock/setDay")
@limiter.limit(RL_OP)
def op_set_day(request: Request, body: SetDay, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    w.day_override = int(_clamp(int(body.day), 0, DAY_MAX))  # fuerza el día (clamp 0..DAY_MAX)
    db.commit()
    db.refresh(w)
    return _payload(w)


@app.post("/op/clock/setSpeed")
@limiter.limit(RL_OP)
def op_set_speed(request: Request, body: SetSpeed, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    _reanchor(w)
    w.speed = int(_clamp(int(body.speed), 1, SPEED_MAX))  # speed 1..SPEED_MAX (ya era ≥1; ahora con techo)
    db.commit()
    db.refresh(w)
    return _payload(w)


@app.post("/op/clock/resync")
@limiter.limit(RL_OP)
def op_resync(request: Request, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
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
@limiter.limit(RL_OP)
def op_set_segment(request: Request, body: SetSegment, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    seg = body.segment
    if seg == "auto":
        w.seg_override = None    # vuelve a la agenda por hora
    elif seg is None:
        w.seg_override = "off"   # deambula
    elif seg in VALID_SEGMENTS:
        w.seg_override = seg     # fuerza el tramo (sólo de la whitelist)
    else:
        raise HTTPException(status_code=400, detail="segment inválido; usá uno de " + ", ".join(sorted(VALID_SEGMENTS)) + ", 'auto' o null")
    db.commit()
    db.refresh(w)
    return _payload(w)


# ---- FASE 2 — EVENTOS: el operador fuerza un evento o togglea el dado automático ----
class SetEvent(BaseModel):
    kind: str  # 'quake' | 'blackout'


class SetEnabled(BaseModel):
    enabled: bool


@app.post("/op/event")
@limiter.limit(RL_OP)
def op_event(request: Request, body: SetEvent, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
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
@limiter.limit(RL_OP)
def op_events(request: Request, body: SetEnabled, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
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


# ---- FASE 3 — CONTADORES: el operador ajusta un contador (el ticker sigue avanzando desde ahí) ----
class SetCounter(BaseModel):
    counter: str   # 'charge' | 'bees' | 'beesReleased' | 'print'
    value: float


@app.post("/op/counter")
@limiter.limit(RL_OP)
def op_counter(request: Request, body: SetCounter, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    name = body.counter
    if name not in COUNTER_BOUNDS:
        raise HTTPException(status_code=400, detail="counter debe ser 'charge'|'bees'|'beesReleased'|'print'")
    lo, hi = COUNTER_BOUNDS[name]
    v = _clamp(float(body.value), lo, hi)  # CLAMP a rango sano: un beesReleased absurdo no corrompe el contador ni el despertar
    if name == "charge":
        w.charge = v
    elif name == "bees":
        w.bees = v
    elif name == "beesReleased":
        w.bees_released = v
    elif name == "print":
        w.print_progress = v
    db.commit()
    db.refresh(w)
    return _payload(w)


# ---- FASE 4 — EL DESPERTAR: el operador fuerza/libera el progreso (para testear las etapas sin esperar meses) ----
class SetAwakening(BaseModel):
    progress: Optional[float] = None  # 0..1 fuerza la etapa · null = 'auto' (vuelve a la curva desde bees_released)


@app.post("/op/awakening")
@limiter.limit(RL_OP)
def op_awakening(request: Request, body: SetAwakening, db: Session = Depends(get_db), x_operator_token: Optional[str] = Header(default=None)):
    _require_op(x_operator_token)
    w = _get_world(db)
    if body.progress is None:
        w.awakening_override = None  # auto: el progreso vuelve a derivarse de bees_released
    else:
        w.awakening_override = max(0.0, min(1.0, float(body.progress)))
    db.commit()
    db.refresh(w)
    return _payload(w)
