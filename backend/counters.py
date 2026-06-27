# REFUGIO 404 — CONTADORES (FASE 3). Lógica pura: avanza charge/bees/bees_released/print por dt real,
# según el segment del server. Replica la lógica del frontend (game.js), salvo bees_released que es el
# modelo NUEVO orgánico (sube de a poco mientras el segment es 'colmena'). El ticker de fondo llama advance().
CHARGE_UP = 0.5        # /s subiendo en 'carga'           (= CHARGE_UP del frontend)
CHARGE_DOWN = 0.08     # /s bajando trabajando            (= CHARGE_DOWN)
CHARGE_FLOOR = 50.0    # piso al que drena
CHARGE_MAX = 100.0

BEE_CAP = 60.0         # tope de la cría                  (= BEE_CAP)
BEE_RATE = 0.5         # /s creciendo en 'colmena'        (= BEE_RATE)
BEE_RESET = 4.0        # cría tras una liberación (diente de sierra)

# RITMO ORGÁNICO de bees_released durante 'colmena'. PLACEHOLDER — se calibra de verdad en la Fase 4
# (el despertar debe sentirse a lo largo de semanas reales). ~0.02/s ≈ 1 liberada cada ~50 s de colmena.
BEES_RELEASED_PER_SEC = 0.02

PRINT_SECS = 50.0      # un ciclo de impresión (0→100)    (= PRINT_SECS)
DT_CAP = 5.0           # capear el dt para que un sleep del server no pegue un salto enorme


def advance(charge, bees, bees_released, print_progress, segment, dt):
    # charge: sube en 'carga', baja en cualquier OTRO tramo con nombre, sin cambio si deambula (segment None)
    if segment == "carga":
        charge = min(CHARGE_MAX, charge + dt * CHARGE_UP)
    elif segment:
        charge = max(CHARGE_FLOOR, charge - dt * CHARGE_DOWN)
    # colmena: la cría crece (diente de sierra al llenarse) + bees_released sube orgánico
    if segment == "colmena":
        bees = bees + dt * BEE_RATE
        if bees >= BEE_CAP:
            bees = BEE_RESET  # liberación → resetea la cría (el frontend ve el salto y dispara el surge)
        bees_released = bees_released + dt * BEES_RELEASED_PER_SEC
    # print: cicla en 'fabricacion' o deambulando (segment None) — igual que el frontend
    if segment == "fabricacion" or segment is None:
        print_progress = print_progress + (dt / PRINT_SECS) * 100.0
        if print_progress >= 100.0:
            print_progress = print_progress - 100.0  # wrap (el frontend ve el salto y cambia la pieza)
    return charge, bees, bees_released, print_progress
