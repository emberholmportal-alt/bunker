# REFUGIO 404 — modelos SQLAlchemy.
# FASE 1: sólo el RELOJ central. La tabla `world` es el singleton del estado del mundo
# (por ahora únicamente los campos del tiempo). En fases siguientes se le agregan los
# contadores, el evento activo, etc. (ver BACKEND_ARCHITECTURE.md).
from sqlalchemy import Column, Integer, BigInteger, String, Boolean
from database import Base


class World(Base):
    __tablename__ = "world"
    id = Column(Integer, primary_key=True)               # singleton: siempre 1
    lore_epoch_ms = Column(BigInteger, nullable=False)   # día 0 del lore (ms UTC) — placeholder; la fecha real se fija después
    speed = Column(Integer, nullable=False, default=1)   # multiplicador del reloj (1 / 800 / 6000)
    anchor_wall_ms = Column(BigInteger, nullable=False)  # tiempo real (ms UTC) en el último anclaje
    anchor_now_ms = Column(BigInteger, nullable=False)   # 'now' del stream en ese anclaje
    day_override = Column(Integer, nullable=True)        # día forzado por el operador (equivale a streamForce('day'))
    # FASE 2 — AGENDA: tramo forzado por el operador. NULL = auto (según la hora) · 'off' = deambular (null en el frontend)
    # · 'carga'/'colmena'/'admin'/'fabricacion'/'ronda'/'ocio' = ese tramo. Equivale al _forceSeg del frontend.
    seg_override = Column(String, nullable=True)
    # FASE 2 — EVENTOS. AUTO (el dado del scheduler): evt_next_at_ms = inicio del próximo/actual evento auto (tiempo REAL ms),
    # evt_next_kind = su tipo. evt_enabled = dado automático on/off. FORZADO por el operador (override, gana sobre el auto):
    # evt_force_kind + su ventana evt_force_start_ms/evt_force_end_ms. El evento activo se computa de estos campos (events.py).
    evt_next_at_ms = Column(BigInteger, nullable=True)
    evt_next_kind = Column(String, nullable=True)
    evt_enabled = Column(Boolean, nullable=False, default=True)
    evt_force_kind = Column(String, nullable=True)
    evt_force_start_ms = Column(BigInteger, nullable=True)
    evt_force_end_ms = Column(BigInteger, nullable=True)


class EventLog(Base):
    __tablename__ = "events_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    kind = Column(String, nullable=False)            # 'quake' | 'blackout'
    started_at_ms = Column(BigInteger, nullable=False)
    ended_at_ms = Column(BigInteger, nullable=False)
    forced = Column(Boolean, nullable=False, default=False)  # ¿lo disparó el operador?
