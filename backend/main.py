# REFUGIO 404 — backend (FASE 1: RELOJ CENTRAL).
# App FastAPI. Lee la URL de la DB de la env var DATABASE_URL (database.py). Sirve el reloj
# del mundo (GET /state) y deja al operador ajustarlo (POST /op/clock/*). CORS abierto para
# que el static site (otro dominio de Render) pueda consultar.
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
    return {
        "now_ms": n,
        "day": day,
        "clock": clk,
        "hour": round(hour, 5),
        "speed": w.speed,
        "segment": _segment(w, hour),  # FASE 2 — AGENDA (string o null=deambular)
        "server_ms": clock.real_ms(),  # para que el frontend corrija el drift si quiere
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
    # MIGRACIÓN idempotente (sin terminal): create_all crea tablas NUEVAS pero NO agrega columnas a
    # una tabla ya existente. Para la fila `world` que ya existe desde la Fase 1, agregamos las
    # columnas nuevas con ADD COLUMN IF NOT EXISTS (Postgres). En SQLite (test local) la tabla se
    # crea fresca con la columna, así que este paso se saltea.
    if engine is None or engine.dialect.name != "postgresql":
        return
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE world ADD COLUMN IF NOT EXISTS seg_override VARCHAR"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas (alcanza con create_all; Alembic entra cuando el esquema crezca), corre la
    # migración idempotente y siembra la fila singleton del mundo.
    if engine is not None:
        Base.metadata.create_all(bind=engine)
        _ensure_columns()
        db = SessionLocal()
        try:
            _get_world(db)
        finally:
            db.close()
    yield


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
