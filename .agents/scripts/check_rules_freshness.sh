#!/usr/bin/env bash

# Detecta drift entre las reglas dinámicas (docs/04_governance_and_quality/rules/, extraídas por
# SK-27) y los documentos fuente de los que se derivan.
# Código 0: verificado — alineado, o con drift informado (no es necesariamente un bug, pero merece
# revisión). Código 2: no verificable — falta la carpeta, falta alguna de las 7 reglas o una regla no
# está commiteada. Anti-Gate-Hueco: lo que no se puede verificar nunca se informa como alineado.
set -uo pipefail

echo "Auditando frescura de reglas dinámicas vs documentos fuente..."
echo ""

RULES_DIR="docs/04_governance_and_quality/rules"
STALE_FOUND=0
UNVERIFIABLE=0
RULE_FILES=(domain_rules.md backend_rules.md frontend_rules.md database_rules.md security_rules.md testing_rules.md git_rules.md)

if [ ! -d "$RULES_DIR" ]; then
  echo "❌ No verificable: $RULES_DIR no existe. Ejecuta SK-27 para generar las reglas del proyecto."
  exit 2
fi

for rule in "${RULE_FILES[@]}"; do
  if [ ! -f "$RULES_DIR/$rule" ]; then
    echo "❌ No verificable: falta $RULES_DIR/$rule (SK-27 genera las 7 reglas)."
    UNVERIFIABLE=1
  elif [ -n "$(git status --porcelain -- "$RULES_DIR/$rule" 2>/dev/null)" ]; then
    echo "❌ No verificable: $RULES_DIR/$rule tiene cambios sin commit; la frescura se mide con el historial de git."
    UNVERIFIABLE=1
  fi
done

last_commit_epoch() {
  git log -1 --format=%ct -- "$1" 2>/dev/null || echo ""
}

check_pair() {
  local rule_file="$1"
  shift
  local sources=("$@")

  [ -f "$rule_file" ] || return 0

  local rule_ts
  rule_ts=$(last_commit_epoch "$rule_file")
  [ -n "$rule_ts" ] || return 0

  for src in "${sources[@]}"; do
    [ -f "$src" ] || continue
    if [ -n "$(git status --porcelain -- "$src" 2>/dev/null)" ]; then
      echo "⚠️  Posible drift: '$src' tiene cambios sin commit posteriores a '$rule_file'."
      STALE_FOUND=1
      continue
    fi
    local src_ts
    src_ts=$(last_commit_epoch "$src")
    [ -n "$src_ts" ] || continue
    if [ "$src_ts" -gt "$rule_ts" ]; then
      echo "⚠️  Posible drift: '$src' cambió después que '$rule_file' — revisa si SK-27 debe re-extraer reglas."
      STALE_FOUND=1
    fi
  done
}

check_pair "$RULES_DIR/domain_rules.md" "docs/02_architecture_design/03_domain_model.md"
check_pair "$RULES_DIR/backend_rules.md" "docs/02_architecture_design/04_technical_design.md" "docs/03_persistence_and_api/07_api_specification.md"
check_pair "$RULES_DIR/frontend_rules.md" "docs/02_architecture_design/05_ui_ux_design_system.md"
check_pair "$RULES_DIR/database_rules.md" "docs/03_persistence_and_api/06_database_schema.md"
check_pair "$RULES_DIR/security_rules.md" "docs/04_governance_and_quality/08_security_strategy.md"
check_pair "$RULES_DIR/testing_rules.md" "docs/04_governance_and_quality/09_testing_strategy.md"
check_pair "$RULES_DIR/git_rules.md" "AGENTS.md"

echo ""
if [ "$UNVERIFIABLE" -ne "0" ]; then
  echo "No verificable: corrige lo marcado con ❌ antes de dar las reglas por alineadas."
  exit 2
elif [ "$STALE_FOUND" -eq "0" ]; then
  echo "✅ Reglas dinámicas alineadas con sus documentos fuente."
else
  echo "Nota: hay documentos fuente más recientes que su regla derivada (ver arriba). No bloqueante — revisión humana recomendada."
fi
