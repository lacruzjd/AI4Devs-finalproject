#!/usr/bin/env bash

# momoy (.agents/) Framework Integrity & Link Validator Script
set -euo pipefail

echo "Validando integridad de momoy (.agents/)..."

# Check directories exist
for dir in workflows skills rules examples; do
  if [ ! -d ".agents/$dir" ]; then
    echo "❌ Error: Directorio faltante .agents/$dir"
    exit 1
  fi
done

echo "✅ Directorios principales verificados."

# Count Skills, Commands & Workflows
SKILLS_COUNT=$(find .agents/skills -name "SK-*.md" | wc -l)
COMMANDS_COUNT=$(find .agents/skills -mindepth 2 -maxdepth 2 -name "SKILL.md" | wc -l)
WORKFLOWS_COUNT=$(find .agents/workflows -name "*.md" | wc -l)

echo "Total de Skills (procedimientos SK-NN) encontradas: $SKILLS_COUNT"
echo "Total de Comandos (Agent Skills SKILL.md) encontrados: $COMMANDS_COUNT"
echo "Total de Workflows encontrados: $WORKFLOWS_COUNT"

# Run self-tests for the audit tooling before trusting its verdict
echo "Ejecutando tests unitarios de las herramientas de auditoría..."
python3 -m unittest discover -s .agents/scripts/tests

# Run Link Integrity Checker
python3 .agents/scripts/check_links.py

# Run Agnosticism Guard (TK-038): .agents/scripts/ nunca debe acoplarse al stack de un proyecto
python3 .agents/scripts/check_agnosticism.py

# Run Emoji Policy Guard: sin emojis en títulos; en el cuerpo solo marcadores semánticos (CONTRIBUTING.md)
python3 .agents/scripts/check_emoji_policy.py

# Run Agent Skills Standard Guard: los comandos de momoy deben ser descubribles por Antigravity/Codex/Gemini/Claude
python3 .agents/scripts/check_skill_standard.py

echo "✅ Arnés momoy (.agents/) verificado exitosamente sin errores de integridad ni enlaces rotos."
