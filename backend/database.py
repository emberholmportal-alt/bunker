# REFUGIO 404 — conexión a la base de datos.
# La URL se lee SIEMPRE de la variable de entorno DATABASE_URL (en Render se setea como
# "environment variable"/secret). NUNCA se hardcodea ninguna credencial acá.
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def _normalize(url: str) -> str:
    # Render a veces entrega la URL como postgres://...; SQLAlchemy 2.0 espera postgresql://...
    if url and url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


DATABASE_URL = _normalize(os.environ.get("DATABASE_URL", "").strip())

# Si no hay DATABASE_URL, el backend igual ARRANCA (para que /health responda y se vea el error
# claro), pero los endpoints que tocan la DB devuelven 503. En Render la variable va a estar seteada.
engine = None
SessionLocal = None
if DATABASE_URL:
    # connect_args sólo aplica a SQLite (para tests locales); en Postgres se ignora.
    _connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300, connect_args=_connect_args)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()
