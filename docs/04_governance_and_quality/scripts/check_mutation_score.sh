#!/usr/bin/env bash

# Generado por SK-27 para: Stryker 8.x (@stryker-mutator/vitest-runner) + pnpm monorepo
# (apps/backend) — ver docs/00_stack_manifest.md. No es portable verbatim a otro motor de
# mutation testing sin volver a correr SK-27 (TK-038: .agents/scripts/ solo contiene
# tooling agnóstico; este script vive en el árbol del proyecto consumidor porque invoca
# `npx stryker` directamente, bloqueado explícitamente para .agents/scripts/*.sh por
# check_agnosticism.py).
#
# Automatiza Guard 11 ("Anti-Test Theater & Code Churn Guard" — Stryker Mutation Score
# >= 70%). Hallazgo que motivó este script (2026-08-31, auditoría de cobertura de
# guardas): apps/backend/stryker.conf.json y el script npm `test:mutation` ya existían,
# correctamente configurados (mutate: src/domain + src/application, thresholds.break: 70)
# — pero no estaban wireados a ningún lado; la guarda llevaba tiempo "cubierta" solo en
# apariencia, sin que nadie la corriera nunca.
#
# CORRECCIÓN (2026-08-31, AUDIT-DEV-002): la primera versión de este script invocaba
# Stryker UNA vez con todos los archivos tocados juntos en `--mutate` y confiaba en su
# código de salida. Eso esconde archivos débiles detrás de archivos fuertes: Stryker
# aplica `thresholds.break` solo al score AGREGADO de la corrida, nunca por archivo. Una
# auditoría real contra TK-077 lo confirmó en vivo: 3 archivos con 86.89% / 75.00% /
# 65.52% dieron 78.81% agregado (pasa) aunque el tercero, aislado, estaba genuinamente
# por debajo del umbral (65.52% < 70%, exit 1 al correrlo solo). Ahora se invoca Stryker
# UNA VEZ POR ARCHIVO tocado — cada invocación mutation-testea un solo archivo, así que
# el `thresholds.break` de Stryker se vuelve, por construcción, un umbral por archivo.
# Costo: N invocaciones en vez de 1 (más lento para tickets con muchos archivos), pero es
# el único diseño que no permite que un archivo compense a otro; se prefiere correcto y
# lento a rápido y silencioso.
# Verificado en vivo (2026-08-31): re-corrida per-file de los 3 archivos de TK-077 detecta
# correctamente el archivo débil (RequestAdminPinResetUseCase.ts, 65.52%, exit 1) que la
# versión agregada anterior no detectaba.
set -uo pipefail

# TK-138: dos modos, una sola fuente de verdad (Guard 27 — el check vive aquí, nunca
# inline en el workflow).
#
#   sin argumento  → LOCAL: archivos sin commitear (working tree + staged + nuevos).
#                    Es el flujo de 02_cascading_dev_workflow.md, sin cambios.
#   con un ref     → CI: diff contra ese ref base (`<base>...HEAD`). En un checkout de CI
#                    no hay nada sin commitear, así que el modo local no encontraría nada
#                    y el gate pasaría en verde sin mutar un solo archivo — un Gate Hueco.
BASE_REF=""
WITH_FRONTEND=0
for arg in "$@"; do
  case "$arg" in
    --with-frontend) WITH_FRONTEND=1 ;;
    *) BASE_REF="$arg" ;;
  esac
done

collect_changed() {
  if [ -n "$BASE_REF" ]; then
    git diff --name-only --diff-filter=ACMR "$BASE_REF...HEAD" -- '*.ts'
  else
    git diff --name-only --diff-filter=ACMR -- '*.ts'
    git diff --name-only --staged --diff-filter=ACMR -- '*.ts'
    git ls-files --others --exclude-standard -- '*.ts'
  fi
}

# TK-138: dos workspaces. Backend → domain/application (logica de negocio pura).
# Frontend → sus .ts (hooks, services, utils); los .tsx quedan fuera a proposito, ver
# el comentario de apps/frontend/stryker.conf.json.
BACKEND_TARGETS=$(collect_changed | sort -u | grep -E '^apps/backend/src/(domain|application)/' | grep -v '\.test\.ts$' | sed 's#^apps/backend/##' || true)
# El frontend queda FUERA del gate automatico por defecto — decision medida, no omision.
# Corrida real 2026-09-09 sobre `src/shared/utils/errorMessageMapper.ts`:
#   · 10 min 42 s UN solo fichero (vs 2:42 en backend, ~4x)
#   · "Ran 9.47 tests per mutant" (vs 32.9-123.9 en backend)
#   · 24 de 89 mutantes son TIMEOUTS, que Stryker cuenta como "detectados" — el mismo
#     patron que invalido la medicion del backend el 2026-09-06: el score esta inflado.
# Un PR que toque 3 ficheros de front sumaria ~32 min de runner para producir un numero
# que sabemos poco fiable. La config (`apps/frontend/stryker.conf.json`) se conserva para
# analisis manual puntual; se incluye en el gate solo con `--with-frontend`.
FRONTEND_TARGETS=""
if [ "$WITH_FRONTEND" -eq 1 ]; then
  FRONTEND_TARGETS=$(collect_changed | sort -u | grep -E '^apps/frontend/src/' | grep -vE '\.test\.ts$|/tests?/' | sed 's#^apps/frontend/##' || true)
fi
MUTATE_TARGETS="$BACKEND_TARGETS"

if [ -n "$BASE_REF" ]; then
  echo "🔍 Verificando Guard 11 (Mutation Score Stryker >= 70%, por archivo) — acotado al diff contra '$BASE_REF'..."
else
  echo "🔍 Verificando Guard 11 (Mutation Score Stryker >= 70%, por archivo) — acotado a domain/application tocados por el ticket en curso..."
fi
echo ""

if [ -z "$BACKEND_TARGETS" ] && [ -z "$FRONTEND_TARGETS" ]; then
  if [ "$WITH_FRONTEND" -eq 1 ]; then
    echo "✨ Nada que mutar: el diff no toca apps/backend/src/{domain,application}/ ni los .ts de apps/frontend/src/."
  else
    echo "✨ Nada que mutar: el diff no toca apps/backend/src/{domain,application}/."
    echo "   (frontend excluido por defecto — usar --with-frontend; ver el porqué medido en este script)"
  fi
  exit 0
fi

REPO_ROOT="$(pwd)"
FAILED_FILES=""

# Muta UN archivo por invocación a propósito (AUDIT-DEV-002): el `thresholds.break` del
# motor se aplica al score AGREGADO de la corrida, así que agrupar archivos deja que uno
# con tests fuertes compense estadísticamente a otro débil y el gate aprueba igual.
mutate_workspace() {
  local workspace="$1" targets="$2"
  [ -z "$targets" ] && return 0

  echo "📦 Workspace: $workspace"
  echo "📄 Archivos a mutar (uno por uno, para que ninguno compense a otro):"
  echo "$targets" | sed 's/^/   - /'
  echo ""

  cd "$REPO_ROOT/$workspace" || return 1
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    echo "▶️  Mutando: $workspace/$file"
    if npx stryker run --mutate "$file" > "/tmp/stryker_output_$$.log" 2>&1; then
      echo "   ✅ OK"
    else
      echo "   ❌ Por debajo del umbral 70%"
      FAILED_FILES="${FAILED_FILES}${workspace}/${file}"$'\n'
      tail -30 "/tmp/stryker_output_$$.log" | sed 's/^/      /'
    fi
    rm -f "/tmp/stryker_output_$$.log"
    echo ""
  done <<< "$targets"
  cd "$REPO_ROOT" || return 1
}

mutate_workspace "apps/backend" "$BACKEND_TARGETS"
mutate_workspace "apps/frontend" "$FRONTEND_TARGETS"

if [ -n "$FAILED_FILES" ]; then
  echo "❌ Mutation Score por debajo del umbral 70% (Guard 11) en:"
  echo "$FAILED_FILES" | sed '/^$/d' | sed 's/^/   - /'
  echo "   Revisa el reporte HTML en <workspace>/reports/mutation/ (se sobreescribe en cada corrida — mira el de la última falla) y refuerza los tests que no matan mutantes sobrevivientes."
  exit 1
fi

echo "✨ Mutation Score >= 70% en TODOS los archivos tocados (verificado por archivo, ninguno compensa a otro)."
