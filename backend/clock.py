# REFUGIO 404 — cálculo del RELOJ central (consistente con el frontend).
#
# El frontend (js/stream.js) define:
#   now (ms)   = Date.now() + offsetMs          (con speed=1; speed>1 acumula extra en offset)
#   day        = floor((now - LORE_EPOCH) / DAY_MS)     [si no está forzado]
#   clock      = HH:MM:SS de la hora UTC de `now`
#   hourUTC    = hora UTC fraccional de `now`
#
# Acá replicamos lo mismo con un modelo "anclado" (anchor) que soporta speed sin saltos:
#   now = anchor_now_ms + (tiempo_real_transcurrido) * speed
import time

DAY_MS = 86_400_000


def real_ms() -> int:
    """Tiempo real del servidor en ms UTC."""
    return int(time.time() * 1000)


def now_ms(world) -> int:
    """'now' del stream: avanza desde el ancla a velocidad `speed`."""
    return int(world.anchor_now_ms + (real_ms() - world.anchor_wall_ms) * world.speed)


def derive(world):
    """Devuelve (now_ms, day, 'HH:MM:SS', hour_fraccional) — el mismo concepto que el frontend."""
    n = now_ms(world)
    if world.day_override is not None:
        day = int(world.day_override)
    else:
        day = max(0, (n - world.lore_epoch_ms) // DAY_MS)
    g = time.gmtime(n // 1000)  # hora UTC de `now`
    clock = "%02d:%02d:%02d" % (g.tm_hour, g.tm_min, g.tm_sec)
    hour = g.tm_hour + g.tm_min / 60.0 + g.tm_sec / 3600.0
    return n, int(day), clock, hour


# FASE 2 — AGENDA: el tramo de rutina según la hora UTC del reloj central. MISMOS cortes que el
# frontend (routineSegment): carga 00-06 · colmena 06-10 · admin 10-13 · fabricación 13-17 ·
# ronda 17-20 · ocio 20-21 · carga 21-00.
def segment_for_hour(h: float) -> str:
    if h < 6:  return "carga"
    if h < 10: return "colmena"
    if h < 13: return "admin"
    if h < 17: return "fabricacion"
    if h < 20: return "ronda"
    if h < 21: return "ocio"
    return "carga"
