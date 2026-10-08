#!/bin/bash
# Batch 3 of image searches for demo store assets
cd /home/z/my-project/scripts
OUT=/home/z/my-project/scripts/imgsearch
mkdir -p $OUT

z-ai image-search -q "baseball cap streetwear accessory product photo plain background" --count 5 --gl us --no-rank -o $OUT/cap.json &
z-ai image-search -q "crossbody shoulder bag streetwear accessory product photo" --count 5 --gl us --no-rank -o $OUT/bag.json &
z-ai image-search -q "group of stylish young friends wearing streetwear outfits in the city" --count 6 --gl us --no-rank -o $OUT/about.json &
z-ai image-search -q "retro football jersey collection folded shirts" --count 6 --gl us --no-rank -o $OUT/jersey2.json &
wait
echo "BATCH3 DONE"
ls -la $OUT
