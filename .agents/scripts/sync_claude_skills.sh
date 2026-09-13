#!/usr/bin/env bash

# Replica los comandos de momoy en .claude/skills/ para Claude Code.
#
# Antigravity, Codex y Gemini CLI descubren .agents/skills/ directamente; Claude Code solo lee
# .claude/skills/. Este script copia cada .agents/skills/momoy*/SKILL.md a
# .claude/skills/<nombre>/SKILL.md e inyecta 'disable-model-invocation: true' (campo propio de
# Claude Code, fuera del estándar portable): el comando solo se lanza cuando el usuario lo
# escribe. La fuente de verdad sigue siendo .agents/skills/ — no edites las copias a mano.
#
# Idempotente. Solo sobrescribe o borra copias que llevan la marca GENERATED_MARKER; un
# .claude/skills/momoy*/SKILL.md escrito a mano por el proyecto nunca se toca.
#
# Uso: bash .agents/scripts/sync_claude_skills.sh [/ruta/al/proyecto]   (por defecto: el proyecto de este .agents/)
set -euo pipefail

AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="${1:-$(dirname "$AGENTS_DIR")}"
DEST_DIR="$PROJECT_DIR/.claude/skills"
GENERATED_MARKER="# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano"

synced=0
skipped=0

for src in "$AGENTS_DIR"/skills/momoy/SKILL.md "$AGENTS_DIR"/skills/momoy-*/SKILL.md; do
  [ -f "$src" ] || continue
  name="$(basename "$(dirname "$src")")"
  dest="$DEST_DIR/$name/SKILL.md"

  if [ -f "$dest" ] && ! grep -qF "$GENERATED_MARKER" "$dest"; then
    echo "⚠️  $dest existe y no fue generado por momoy — no se toca."
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$DEST_DIR/$name"
  {
    echo "---"
    echo "$GENERATED_MARKER"
    echo "disable-model-invocation: true"
    tail -n +2 "$src"
  } > "$dest"
  synced=$((synced + 1))
done

# Retira copias generadas cuyo comando ya no existe en .agents/skills/.
for dest in "$DEST_DIR"/momoy/SKILL.md "$DEST_DIR"/momoy-*/SKILL.md; do
  [ -f "$dest" ] || continue
  name="$(basename "$(dirname "$dest")")"
  if [ ! -f "$AGENTS_DIR/skills/$name/SKILL.md" ] && grep -qF "$GENERATED_MARKER" "$dest"; then
    rm -f "$dest"
    rmdir "$DEST_DIR/$name" 2>/dev/null || true
    echo "Retirado comando obsoleto: $name"
  fi
done

echo "✅ $synced comandos de momoy sincronizados en $DEST_DIR (Claude Code); $skipped omitidos."
