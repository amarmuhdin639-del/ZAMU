#!/bin/bash
# Batch 2 of image searches for demo store assets
cd /home/z/my-project/scripts
OUT=/home/z/my-project/scripts/imgsearch
mkdir -p $OUT

z-ai image-search -q "hoodie streetwear apparel product photo plain background" --count 8 --gl us --no-rank -o $OUT/hoodie.json &
z-ai image-search -q "tracksuit jacket sportswear product photo" --count 6 --gl us --no-rank -o $OUT/tracksuit.json &
z-ai image-search -q "basketball shorts streetwear product photo" --count 5 --gl us --no-rank -o $OUT/shorts.json &
z-ai image-search -q "varsity bomber jacket streetwear product photo" --count 6 --gl us --no-rank -o $OUT/jacket.json &
wait
echo "BATCH2 DONE"
ls -la $OUT
