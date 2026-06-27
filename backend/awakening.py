# REFUGIO 404 — EL DESPERTAR (FASE 4). Lógica pura: el progreso del despertar se DERIVA de bees_released
# con una curva de rendimientos decrecientes (asintótica: nunca llega a 1 → la duda nunca se resuelve).
# Se calcula on-read en /state (no hay estado ni ticker nuevo). La etapa (0-3) se deriva del progreso.
import math

# Knob principal: a mayor K, más LENTO. Con bees_released ~288/día (colmena 4h a x1), K=15000 da
# ~12 días a Etapa 1, ~1 mes a Etapa 2, ~2 meses a Etapa 3, ~4 meses a 90%. Calibrable.
K = 15000.0
STAGE_THRESHOLDS = (0.20, 0.45, 0.70)  # 0:[0,.20) · 1:[.20,.45) · 2:[.45,.70) · 3:[.70,1]


def progress_for(bees_released: float) -> float:
    if bees_released is None or bees_released <= 0:
        return 0.0
    return 1.0 - math.exp(-bees_released / K)


def stage_for(progress: float) -> int:
    if progress < STAGE_THRESHOLDS[0]:
        return 0
    if progress < STAGE_THRESHOLDS[1]:
        return 1
    if progress < STAGE_THRESHOLDS[2]:
        return 2
    return 3
