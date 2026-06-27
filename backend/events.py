# REFUGIO 404 — EVENTOS (FASE 2, Parte A). Lógica pura: constantes, dado, y cómputo del evento
# ACTIVO a partir del estado persistido. El scheduler (tarea de fondo) y /state usan esto.
# Todo en TIEMPO REAL (ms), igual que el frontend hoy (el dado corre con dt real, no con el reloj del stream).
import random

QUAKE_DUR_MS = 13_000      # duración del temblor (13 s) — igual que EV_QUAKE_DUR del frontend
BLACKOUT_DUR_MS = 14_000   # duración del fallo eléctrico (14 s) — igual que EV_BLACKOUT_DUR
GAP_MIN_MS = 180_000       # gap mínimo entre eventos auto (3 min)  — igual que EV_GAP_MIN
GAP_MAX_MS = 360_000       # gap máximo entre eventos auto (6 min)  — igual que EV_GAP_MAX


def dur_ms(kind: str) -> int:
    return QUAKE_DUR_MS if kind == "quake" else BLACKOUT_DUR_MS


def random_kind() -> str:
    return "quake" if random.random() < 0.5 else "blackout"


def random_gap_ms() -> int:
    return GAP_MIN_MS + int(random.random() * (GAP_MAX_MS - GAP_MIN_MS))


def active_event(w, now_ms: int):
    """Evento ACTIVO ahora (read-only). Devuelve (kind, start_ms, end_ms, forced) o (None, None, None, False).
    El FORZADO del operador gana sobre el AUTO (no se solapan)."""
    # 1) override del operador
    if w.evt_force_kind and w.evt_force_end_ms is not None and now_ms < w.evt_force_end_ms:
        return (w.evt_force_kind, w.evt_force_start_ms, w.evt_force_end_ms, True)
    # 2) auto: el evento programado está activo si now cae en su ventana [next_at, next_at+dur]
    if w.evt_enabled and w.evt_next_at_ms is not None and w.evt_next_kind:
        end = w.evt_next_at_ms + dur_ms(w.evt_next_kind)
        if w.evt_next_at_ms <= now_ms < end:
            return (w.evt_next_kind, w.evt_next_at_ms, end, False)
    return (None, None, None, False)
