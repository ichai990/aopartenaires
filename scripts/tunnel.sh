#!/bin/sh
# Tunnel public auto-relançant vers le serveur local (port 3001).
# L'URL courante est écrite dans /tmp/btpilot-tunnel-url.txt à chaque (re)connexion.
# NB : solution de démo — l'URL change à chaque reconnexion. Pour une URL
# stable, déployez sur Vercel ou le VPS (voir README).
while true; do
  ssh -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -R 80:localhost:3001 nokey@localhost.run 2>&1 | while IFS= read -r line; do
    echo "$line"
    url=$(printf '%s' "$line" | grep -o 'https://[a-z0-9]*\.lhr\.life' | head -1)
    [ -n "$url" ] && printf '%s' "$url" > /tmp/btpilot-tunnel-url.txt
  done
  echo "[tunnel] connexion perdue — relance dans 3 s…"
  sleep 3
done
