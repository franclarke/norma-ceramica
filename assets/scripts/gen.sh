#!/usr/bin/env bash
# Genera una hoja de arte con Codex CLI.
# Uso: bash assets/scripts/gen.sh <nombre> [ink]
#   <nombre>  prompt en assets/prompts/<nombre>.md; la imagen queda en assets/raw/<nombre>.png
#   ink       antepone el estilo común de tinta china (assets/prompts/_style-ink.md)
set -euo pipefail

NAME="$1"
STYLE="${2:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX="${CODEX_BIN:-codex}"
if ! command -v "$CODEX" >/dev/null 2>&1; then
  CODEX="$(ls -d "$LOCALAPPDATA"/OpenAI/Codex/bin/*/codex.exe 2>/dev/null | head -1)"
fi

ART="$(cat "$ROOT/assets/prompts/$NAME.md")"
if [ "$STYLE" = "ink" ]; then
  ART="$(cat "$ROOT/assets/prompts/_style-ink.md")

$ART"
fi

mkdir -p "$ROOT/assets/raw" "$ROOT/assets/logs"

"$CODEX" exec --skip-git-repo-check -s workspace-write -C "$ROOT" - <<EOF > "$ROOT/assets/logs/$NAME.log" 2>&1
You are producing artwork files for a website. Use your built-in image generation tool to generate exactly ONE image from the ART PROMPT below, passing it to the image tool faithfully.
Then save the generated PNG as ./assets/raw/$NAME.png (relative to the current working directory). If that file already exists, use ./assets/raw/$NAME-2.png, -3 and so on; never overwrite.
Do not crop, edit or post-process the image. Do not write code and do not create any other file. Reply with only the saved file path.

ART PROMPT:
$ART
EOF

tail -5 "$ROOT/assets/logs/$NAME.log"
