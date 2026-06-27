# REFUGIO 404 — modelos SQLAlchemy.
# FASE 1: sólo el RELOJ central. La tabla `world` es el singleton del estado del mundo
# (por ahora únicamente los campos del tiempo). En fases siguientes se le agregan los
# contadores, el evento activo, etc. (ver BACKEND_ARCHITECTURE.md).
from sqlalchemy import Column, Integer, BigInteger
from database import Base


class World(Base):
    __tablename__ = "world"
    id = Column(Integer, primary_key=True)               # singleton: siempre 1
    lore_epoch_ms = Column(BigInteger, nullable=False)   # día 0 del lore (ms UTC) — placeholder; la fecha real se fija después
    speed = Column(Integer, nullable=False, default=1)   # multiplicador del reloj (1 / 800 / 6000)
    anchor_wall_ms = Column(BigInteger, nullable=False)  # tiempo real (ms UTC) en el último anclaje
    anchor_now_ms = Column(BigInteger, nullable=False)   # 'now' del stream en ese anclaje
    day_override = Column(Integer, nullable=True)        # día forzado por el operador (equivale a streamForce('day'))
