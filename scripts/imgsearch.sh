#!/bin/bash
# Sequential image search with retry/backoff. Usage: imgsearch.sh <batch>
OUT=/home/z/my-project/scripts/imgsearch
mkdir -p $OUT

search() {
  local name=$1; shift
  local query=$1; shift
  local count=$1; shift
  if [ -s "$OUT/$name.json" ] && grep -q '"success": true' "$OUT/$name.json"; then
    echo "SKIP $name (already done)"
    return 0
  fi
  for attempt in 1 2 3 4; do
    echo ">>> [$name] attempt $attempt: $query"
    z-ai image-search -q "$query" --count "$count" --gl us --no-rank -o "$OUT/$name.json" && \
      grep -q '"success": true' "$OUT/$name.json" && { echo "OK $name"; return 0; }
    echo "retry $name in 25s..."
    sleep 25
  done
  echo "FAILED $name"
  return 1
}

case "${1:-all}" in
  1)
    search hero "young man wearing football soccer jersey streetwear fashion urban editorial" 8
    sleep 8
    search jersey "football soccer jersey shirt product photo plain background" 10
    ;;
  2)
    search baggy "baggy wide leg cargo pants streetwear product photo" 8
    sleep 8
    search tee "oversized t-shirt streetwear product photo plain background" 8
    ;;
  3)
    search hoodie "hoodie streetwear product photo plain background" 8
    sleep 8
    search tracksuit "tracksuit jacket sportswear product photo" 6
    ;;
  4)
    search shorts "basketball shorts streetwear product photo" 5
    sleep 8
    search jacket "varsity bomber jacket streetwear product photo" 6
    ;;
  5)
    search cap "baseball cap streetwear accessory product photo" 5
    sleep 8
    search bag "crossbody shoulder bag streetwear accessory product photo" 5
    ;;
  6)
    search about "group of stylish young friends wearing streetwear outfits in the city" 6
    sleep 8
    search jersey2 "retro football jerseys collection hanging" 6
    ;;
esac
echo "BATCH $1 COMPLETE"
