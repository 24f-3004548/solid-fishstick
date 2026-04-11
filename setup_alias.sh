#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZSHRC="$HOME/.zshrc"
ALIAS_UP="alias careersync-up='cd \"$ROOT_DIR\" && ./start_all.sh'"
ALIAS_DOWN="alias careersync-down='cd \"$ROOT_DIR\" && ./stop_all.sh'"

if [[ ! -f "$ZSHRC" ]]; then
  touch "$ZSHRC"
fi

added=0

if ! grep -Fq "$ALIAS_UP" "$ZSHRC"; then
  {
    echo ""
    echo "# CareerSync"
    echo "$ALIAS_UP"
  } >> "$ZSHRC"
  added=1
fi

if ! grep -Fq "$ALIAS_DOWN" "$ZSHRC"; then
  echo "$ALIAS_DOWN" >> "$ZSHRC"
  added=1
fi

if [[ "$added" -eq 1 ]]; then
  echo "Aliases updated in $ZSHRC"
else
  echo "Aliases already exist in $ZSHRC"
fi

echo "Run: source ~/.zshrc"
echo "Then use: careersync-up (start) / careersync-down (stop)"
