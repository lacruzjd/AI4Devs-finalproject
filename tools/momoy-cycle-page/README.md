# Página «Ciclo completo de momoy»

Marcador de progreso de momoy hacia su propósito final: ser fuerte en las 12 etapas del ciclo de vida del software. No forma parte de momoy (`.agents/`): es una herramienta de seguimiento de este repositorio.

## Actualizarla tras cada ola

1. Edita en `build.py` los datos que cambiaron: `VERSION`, `MEASURED`, las puntuaciones `now` de cada etapa en `STAGES` (0 no, 1 parcial, 2 cumple), una fila nueva en `EVOLUTION` y el estado de `WAVES`. Cada condición marcada como cumplida debe tener evidencia en `.agents/` o en una ejecución real.
2. Genera la página: `python3 tools/momoy-cycle-page/build.py` (escribe `dist/ciclo-momoy.html`, ignorado por git).
3. Publícala **sobre el mismo artifact**, pasando su URL para no crear uno nuevo: https://claude.ai/code/artifact/f1079345-1d53-437e-9281-10147752f1a7

## Criterio

Una etapa es **fuerte** con las 6 condiciones (procedimiento, artefacto, gate verificable, pausa humana, comando y probado en real); **casi** con 5; **parcial** de 2 a 4,5; **ausente** por debajo de 2.
