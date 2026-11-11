#!/usr/bin/env bash
# Genera una composición (comp) de página con Codex CLI.
# Uso: bash assets/scripts/comp.sh <prompt.md> <salida.png> [referencia.png ...]
set -euo pipefail

PROMPT_FILE="$1"; OUT="$2"; shift 2
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX="${CODEX_BIN:-codex}"
command -v "$CODEX" >/dev/null 2>&1 || CODEX="$(ls -d "$LOCALAPPDATA"/OpenAI/Codex/bin/*/codex.exe 2>/dev/null | head -1)"

IMGS=()
for ref in "$@"; do IMGS+=(-i "$ref"); done
mkdir -p "$(dirname "$ROOT/$OUT")" "$ROOT/assets/logs"
LOG="$ROOT/assets/logs/$(basename "$OUT" .png).log"

"$CODEX" exec --skip-git-repo-check -s workspace-write -C "$ROOT" "${IMGS[@]}" - <<EOF > "$LOG" 2>&1
You are producing a design comp. Use your built-in image generation tool to generate exactly ONE image (portrait 1024x1536 unless the prompt says landscape 1536x1024) from the PROMPT below, passing it to the image tool faithfully.$( [ $# -gt 0 ] && echo " The attached images are style references only: pass them to the image tool as reference images if it accepts them; never copy their layout or content." )
Save the generated PNG as ./$OUT (relative to the current working directory), overwriting nothing else. Do not edit the image, do not write code, do not create other files. Reply with only the saved path.

PROMPT:
$(cat "$PROMPT_FILE")
EOF

tail -2 "$LOG"
