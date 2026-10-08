#!/bin/bash
# Batch 1 of image searches for demo store assets
cd /home/z/my-project/scripts
OUT=/home/z/my-project/scripts/imgsearch
mkdir -p $OUT

z-ai image-search -q "young man wearing football soccer jersey and baggy pants streetwear urban fashion editorial photo" --count 8 --gl us --no-rank -o $OUT/hero.json &
z-ai image-search -q "football soccer jersey shirt product photo hanging plain background" --count 10 --gl us --no-rank -o $OUT/jersey.json &
z-ai image-search -q "baggy wide leg cargo pants streetwear product photo" --count 8 --gl us --no-rank -o $OUT/baggy.json &
z-ai image-search -q "oversized t-shirt streetwear apparel product photo plain background" --count 8 --gl us --no-rank -o $OUT/tee.json &
wait
echo "BATCH1 DONE"
ls -la $OUT
