#!/bin/bash
# คีย์พื้นเขียวออก + ดึงขอบเขียว (despill) — ใช้กับภาพที่ Codex เจนบนพื้นเขียว
set -euo pipefail
in="$1"; out="$2"
magick "$in" \
  -fuzz 30% -transparent "srgb(4,246,10)" \
  -channel G -fx "min(u, max(r,b) + 0.06)" +channel \
  -channel A -fx "u * (1 - 2.2*max(0, (g - max(r,b)) - 0.02))" +channel \
  "$out"
