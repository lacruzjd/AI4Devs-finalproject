#!/usr/bin/env bash

# Generado por SK-27 para: pnpm + Vitest (reporter verbose) — ver docs/00_stack_manifest.md.
# No es portable verbatim a otro test runner (Jest, pytest, go test...) sin volver a correr
# SK-27 (TK-038: .agents/scripts/ solo contiene tooling agnóstico; los scripts acoplados al
# stack del proyecto viven aquí, generados, no en el payload portable).
#
# M-02: Script de profiling real de la suite de pruebas — emite métricas de tiempo por archivo.
# Detecta tests lentos (>1000ms) que pueden causar regresiones de velocidad en CI.
# Sin -e a propósito: es un profiler informativo (wireado con continue-on-error en CI),
# no un gate; debe imprimir el resumen completo incluso si una etapa intermedia falla.
set -uo pipefail

SLOW_THRESHOLD_MS=1000
DRIFT_FOUND=0

echo "⏱️  Auditando velocidad de ejecución de la suite de pruebas..."
echo "📊 Umbral de lentitud: ${SLOW_THRESHOLD_MS}ms por archivo de test"
echo ""

if [ ! -f "package.json" ]; then
  echo "⚠️  package.json no encontrado. Ejecutar desde la raíz del monorepo."
  exit 1
fi

# Ejecutar suite con output JSON para extraer tiempos reales
REPORT_FILE="/tmp/vitest_profile_$(date +%s).txt"

pnpm test -- --reporter=verbose 2>&1 | tee "$REPORT_FILE" | \
  grep -E "✓|×|PASS|FAIL|ms\)" | \
  grep -oE "[0-9]+ ms" | \
  sort -n | \
  uniq -c | \
  awk '{print $2, "ms →", $1, "test(s)"}' || true

echo ""
echo "📋 Archivos de test y tiempos (desde output verbose):"
grep -E "✓|×" "$REPORT_FILE" 2>/dev/null | \
  grep -oE "\([0-9]+ ms\)" | \
  tr -d '()' | \
  sort -rn | \
  head -20 | \
  while read -r time unit; do
    ms=$time
    if [ "$ms" -gt "$SLOW_THRESHOLD_MS" ] 2>/dev/null; then
      echo "   🚨 LENTO: ${ms}ms (supera umbral de ${SLOW_THRESHOLD_MS}ms)"
      DRIFT_FOUND=1
    else
      echo "   ✅ ${ms}ms"
    fi
  done || true

# Extraer tiempo total de suite
TOTAL_TIME=$(grep -E "Duration|duration" "$REPORT_FILE" 2>/dev/null | head -1 || true)
if [ -n "$TOTAL_TIME" ]; then
  echo ""
  echo "⏱️  Tiempo total de suite: $TOTAL_TIME"
fi

# Contar tests pasados y fallidos.
#
# TK-144: antes se hacía `grep -c "×\|FAIL"` sobre TODO el log, lo que contaba también las
# líneas de `stderr` que los tests emiten a propósito (mensajes de mock fallback, trazas de
# error esperadas). En la corrida #14 de CI eso reportó "830 pasados / 4 fallidos" con la
# suite entera en verde y el paso saliendo con código 0. Un paso informativo que inventa
# fallos inexistentes erosiona la confianza en todo el resto del reporte.
#
# Ahora se derivan del resumen del propio runner (`Tests  N passed (N)` /
# `Tests  N failed | M passed (T)`), que es la única línea con autoridad sobre el resultado.
SUMMARY=$(grep -E "^[[:space:]]*Tests[[:space:]]+[0-9]" "$REPORT_FILE" 2>/dev/null || true)
PASSED=$(echo "$SUMMARY" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" | awk '{t+=$1} END {print t+0}')
FAILED=$(echo "$SUMMARY" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" | awk '{t+=$1} END {print t+0}')

echo ""
echo "📊 Resumen:"
if [ -z "$SUMMARY" ]; then
  echo "   ⚠️  No se encontró la línea de resumen del runner — conteo no disponible."
  echo "      (informativo: el veredicto real lo da el paso 'Run Test Suite', no este script)"
else
  echo "   ✅ Tests pasados: $PASSED"
  echo "   ❌ Tests fallidos: $FAILED"
fi

rm -f "$REPORT_FILE"

echo ""
echo "✨ Profiling de la suite de pruebas completado."
